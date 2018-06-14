const Sequelize = require("sequelize");
const Op = Sequelize.Op;
const {models} = require("../models");

const paginate = require('../helpers/paginate').paginate;

// Autoload the quiz with id equals to :quizId
exports.load = (req, res, next, quizId) => {

    models.quiz.findById(quizId, {
        include: [
            {model: models.tip, include:[ {model: models.user, as: 'author'}]},
            {model: models.user, as: 'author'}
    ]
    })
    .then(quiz => {
        if (quiz) {
            req.quiz = quiz;
            next();
        } else {
            throw new Error('There is no quiz with id=' + quizId);
        }
    })
    .catch(error => next(error));
};


// MW that allows actions only if the user logged in is admin or is the author of the quiz.
exports.adminOrAuthorRequired = (req, res, next) => {

    const isAdmin  = !!req.session.user.isAdmin;
    const isAuthor = req.quiz.authorId === req.session.user.id;

    if (isAdmin || isAuthor) {
        next();
    } else {
        console.log('Prohibited operation: The logged in user is not the author of the quiz, nor an administrator.');
        res.send(403);
    }
};


// GET /quizzes
exports.index = (req, res, next) => {

    let countOptions = {
        where: {}
    };

    let title = "Questions";

    // Search:
    const search = req.query.search || '';
    if (search) {
        const search_like = "%" + search.replace(/ +/g,"%") + "%";

        countOptions.where.question = { [Op.like]: search_like };
    }

    // If there exists "req.user", then only the quizzes of that user are shown
    if (req.user) {
        countOptions.where.authorId = req.user.id;
        title = "Questions of " + req.user.username;
    }

    models.quiz.count(countOptions)
    .then(count => {

        // Pagination:

        const items_per_page = 10;

        // The page to show is given in the query
        const pageno = parseInt(req.query.pageno) || 1;

        // Create a String with the HTMl used to render the pagination buttons.
        // This String is added to a local variable of res, which is used into the application layout file.
        res.locals.paginate_control = paginate(count, items_per_page, pageno, req.url);

        const findOptions = {
            ...countOptions,
            offset: items_per_page * (pageno - 1),
            limit: items_per_page,
            include: [{model: models.user, as: 'author'}]
        };

        return models.quiz.findAll(findOptions);
    })
    .then(quizzes => {
        res.render('quizzes/index.ejs', {
            quizzes, 
            search,
            title
        });
    })
    .catch(error => next(error));
};


// GET /quizzes/:quizId
exports.show = (req, res, next) => {

    const {quiz} = req;

    res.render('quizzes/show', {quiz});
};


// GET /quizzes/new
exports.new = (req, res, next) => {

    const quiz = {
        question: "", 
        answer: ""
    };

    res.render('quizzes/new', {quiz});
};

// POST /quizzes/create
exports.create = (req, res, next) => {

    const {question, answer} = req.body;

    const authorId = req.session.user && req.session.user.id || 0;

    const quiz = models.quiz.build({
        question,
        answer,
        authorId
    });

    // Saves only the fields question and answer into the DDBB
    quiz.save({fields: ["question", "answer", "authorId"]})
    .then(quiz => {
        req.flash('success', 'Quiz created successfully.');
        res.redirect('/quizzes/' + quiz.id);
    })
    .catch(Sequelize.ValidationError, error => {
        req.flash('error', 'There are errors in the form:');
        error.errors.forEach(({message}) => req.flash('error', message));
        res.render('quizzes/new', {quiz});
    })
    .catch(error => {
        req.flash('error', 'Error creating a new Quiz: ' + error.message);
        next(error);
    });
};


// GET /quizzes/:quizId/edit
exports.edit = (req, res, next) => {

    const {quiz} = req;

    res.render('quizzes/edit', {quiz});
};


// PUT /quizzes/:quizId
exports.update = (req, res, next) => {

    const {quiz, body} = req;

    quiz.question = body.question;
    quiz.answer = body.answer;

    quiz.save({fields: ["question", "answer"]})
    .then(quiz => {
        req.flash('success', 'Quiz edited successfully.');
        res.redirect('/quizzes/' + quiz.id);
    })
    .catch(Sequelize.ValidationError, error => {
        req.flash('error', 'There are errors in the form:');
        error.errors.forEach(({message}) => req.flash('error', message));
        res.render('quizzes/edit', {quiz});
    })
    .catch(error => {
        req.flash('error', 'Error editing the Quiz: ' + error.message);
        next(error);
    });
};


// DELETE /quizzes/:quizId
exports.destroy = (req, res, next) => {

    req.quiz.destroy()
    .then(() => {
        req.flash('success', 'Quiz deleted successfully.');
        res.redirect('/goback');
    })
    .catch(error => {
        req.flash('error', 'Error deleting the Quiz: ' + error.message);
        next(error);
    });
};


// GET /quizzes/:quizId/play
exports.play = (req, res, next) => {

    const {quiz, query} = req;

    const answer = query.answer || '';

    res.render('quizzes/play', {
        quiz,
        answer
    });
};


// GET /quizzes/:quizId/check
exports.check = (req, res, next) => {

    const {quiz, query} = req;

    const answer = query.answer || "";
    const result = answer.toLowerCase().trim() === quiz.answer.toLowerCase().trim();

    res.render('quizzes/result', {
        quiz,
        result,
        answer
    });
};



// GET /quizzes/randomplay
exports.randomplay = (req, res, next) => {

    req.session.randomPlay= req.session.randomPlay || []; //Inicialmente, si no existe el array, lo creo

    const whereOpt={'id':{[Sequelize.Op.notIn]: req.session.randomPlay}};//Operador utilizado para que me devuelva de models.quiz sólo aquellos que no estén ya en randomPlay

    models.quiz.count({where:whereOpt})
        .then(count => {


            if (count === 0) {                              //Si la cuenta es 0, significa que no hay preguntas resueltas
                const score = req.session.randomPlay.length;
               delete req.session.randomPlay;
               delete req.session.tipsforquiz;
               delete req.session.maxCredits;
                res.render('quizzes/random_nomore', {
                    score: score
                });
            }
            else {

                return models.quiz.findAll({
                    where: whereOpt,
                    offset: Math.floor(Math.random() * count),
                    include: [ {model: models.tip}], //añadido como mejora: tips (sin nombre de autor) en randomplay
                    limit: 1

                }).then(quizzes => {

                    if(typeof req.session.tipsforquiz ==='undefined'){
                        req.session.tipsforquiz={};
                    }
                    req.session.tipsforquiz.tips=quizzes[0].tips;
                    return quizzes[0];



                }).then(quiz => {


                    if(typeof req.session.tipsforquiz.creditsleft==='undefined'){
                        req.session.tipsforquiz.creditsleft=req.session.maxCredits;
                    }

                    res.render('quizzes/random_play', {
                        quiz: quiz,
                        score: req.session.randomPlay.length,
                        randomplay:true,
                        credits:req.session.tipsforquiz.creditsleft
                    })
                }).catch(error => next(error));
            }
        })
        .catch(error=> next(error));


};



/*RandomCheck */

exports.randomcheck = (req, res, next) => {

    if((typeof req.session.usedTips!=='undefined')&&(typeof req.session.tipsforquiz!=='undefined')) {
        delete req.session.usedTips;
        delete req.session.tipsforquiz.tips;
    }


    const {quiz, query} = req;
    let score =req.session.randomPlay.length;


    const answer= query.answer.toLowerCase().trim();
    const result = (answer=== quiz.answer.toLowerCase().trim());


   if(result){
       if(! req.session.randomPlay.includes(quiz.id)){
         req.session.randomPlay.push(quiz.id);
           score=req.session.randomPlay.length;

       }
   }else{
      delete req.session.tipsforquiz;
      delete req.session.usedTips;
      delete req.session.maxCredits;
      delete req.session.randomPlay;
   }

   res.render('quizzes/random_result',{
       result:result,
       answer:answer,
       score:score
   });

};
//first mw called on randomplay and randomcheck routes, to set up countdown
exports.create_countdown=(req,res,next)=> {
    let allowedTime = 10;
        let countprops = {
            "count": allowedTime,
            "allowedTime": allowedTime
        };
    req.session.countprops = countprops;
    res.locals.allowedTime=req.session.countprops.allowedTime;
    next();
};

//GET /quizzes/randomplay/countdown             partial dynamic view
exports.countdown=(req,res,next)=> {

    if(req.session.countprops.count!==0){
        req.session.countprops.count--;
    }
    else if(req.session.countprops.count===0){
        req.session.countprops.count=allowedTime;
    }
    res.json({ "count":req.session.countprops.count});


};

//GET /quizzes/randomplay/timeup
exports.timeup=(req,res,next)=> {

    let score =req.session.randomPlay.length||0;
    req.session.randomPlay=[];
    req.session.tipsforquiz={};
    req.session.usedTips=[];
    req.session.maxCredits=undefined;
    res.render('quizzes/timeup',{score:score});

};


exports.anonimos=(req,res,next)=>{

    console.log("Tengo que ver esto");

    models.quiz.findAll({
        where:{
            authorId:0
        }
    }).then(quizzes=> {
           for(var i in quizzes){
               console.log(`Pregunta de quiz: ${quizzes[i].question} Id autor: ${quizzes[i].authorId}`);
           }
           console.log("hola?");
           res.render('quizzes/anonimos',{quizzes});
        })
        .catch(error=> next(error));
};















