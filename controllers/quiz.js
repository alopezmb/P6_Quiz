const Sequelize = require("sequelize");
const {models} = require("../models");

// Autoload the quiz with id equals to :quizId
exports.load = (req, res, next, quizId) => {

    models.quiz.findById(quizId)
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


// GET /quizzes
exports.index = (req, res, next) => {

    models.quiz.findAll()
    .then(quizzes => {
        res.render('quizzes/index.ejs', {quizzes});
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

    const quiz = models.quiz.build({
        question,
        answer
    });

    // Saves only the fields question and answer into the DDBB
    quiz.save({fields: ["question", "answer"]})
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
        res.redirect('/quizzes');
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
                req.session.randomPlay = [];
                res.render('quizzes/random_nomore', {
                    score: score
                });
            }
            else {

                return models.quiz.findAll({
                    where: whereOpt,
                    offset: Math.floor(Math.random() * count),
                    limit: 1

                }).then(quizzes => {

//!*debugging console.log(quizzes[0].question);
//console.log(quizzes[0].answer);

                    return quizzes[0];

                }).then(quiz => {
                    res.render('quizzes/random_play', {
                        quiz: quiz,
                        score: req.session.randomPlay.length
                    })
                }).catch(error => next(error));
            }
        })
        .catch(error=> next(error));


};



/*RandomCheck */

exports.randomcheck = (req, res, next) => {

    const {quiz, query} = req;

    let score =req.session.randomPlay.length;

    const answer= query.answer.toLowerCase().trim();
    const result = (answer=== quiz.answer.toLowerCase().trim());
   //!*debug console.log(`Respuesta ${answer}`);
   // console.log(`real ans ${req.session.currentquiz.answer}`);

   if(result){
       if(! req.session.randomPlay.includes(quiz.id)){
         req.session.randomPlay.push(quiz.id);
           score=req.session.randomPlay.length;

       }
   }else{
       req.session.randomPlay=[];

   }
   res.render('quizzes/random_result',{
       result:result,
       answer:answer,
       score:score
   })




};



exports.randomcheck = (req, res, next) => {

    const {quiz, query} = req;

    const answer = query.answer || "";
    const result = answer.toLowerCase().trim() === quiz.answer.toLowerCase().trim();
    let lastScore = req.session.randomPlay.length;

    result ? req.session.randomPlay.push(quiz.id) : req.session.randomPlay = [];

    res.render('quizzes/random_result', {
        answer,
        quiz,
        result,
        score: result ? ++lastScore : lastScore
    });


};










