const Sequelize = require("sequelize");
const {models} = require("../models");


// Autoload the tip with id equals to :tipId
exports.load = (req, res, next, tipId) => {

    models.tip.findById(tipId)
    .then(tip => {
        if (tip) {
            req.tip = tip;
            next();
        } else {
            next(new Error('There is no tip with tipId=' + tipId));
        }
    })
    .catch(error => next(error));
};

// MW that allows actions only if the user logged in is admin or is the author of the tip
exports.adminOrAuthorRequired = (req, res, next) => {

    const isAdmin  = !!req.session.user.isAdmin;
    const isTipAuthor = req.tip.authorId === req.session.user.id;

    if (isAdmin || isTipAuthor) {
        next();
    } else {
        console.log('Prohibited operation: The logged in user is not the author of the quiz, nor an administrator.');
        res.send(403);
    }
};


// GET /quizzes/:quizId/tips/:tipId/edit
exports.edit = (req, res, next) => {
//cargo así y no luego en la vista con quiz.tips porque eso me da todas las del autor, quiero una específica.

    const {tip,quiz} = req;

    res.render('tips/edit', {tip:tip,quiz:quiz});
};

// PUT /quizzes/:quizId/tips/:tipId
exports.update = (req, res, next) => {

    const {tip,quiz,body} = req;

    tip.text = body.tipEdit;
    tip.accepted=false;

    tip.save({fields: ["text","accepted"]})
        .then(tip => {
            req.flash('success', 'Tip edited successfully.');
            res.redirect('/quizzes/' + quiz.id);
        })
        .catch(Sequelize.ValidationError, error => {
            req.flash('error', 'There are errors in the form:');
            error.errors.forEach(({message}) => req.flash('error', message));
            res.render('tips/edit', {tip,quiz});
        })
        .catch(error => {
            req.flash('error', 'Error editing the Tip: ' + error.message);
            next(error);
        });
};



// POST /quizzes/:quizId/tips
exports.create = (req, res, next) => {

    const authorId = req.session.user && req.session.user.id || 0;
 
    const tip = models.tip.build(
        {
            text: req.body.text,
            quizId: req.quiz.id,
            authorId
        });

    tip.save()
    .then(tip => {
        req.flash('success', 'Tip created successfully.');
        res.redirect("back");
    })
    .catch(Sequelize.ValidationError, error => {
        req.flash('error', 'There are errors in the form:');
        error.errors.forEach(({message}) => req.flash('error', message));
        res.redirect("back");
    })
    .catch(error => {
        req.flash('error', 'Error creating the new tip: ' + error.message);
        next(error);
    });
};


// GET /quizzes/:quizId/tips/:tipId/accept
exports.accept = (req, res, next) => {

    const {tip} = req;

    tip.accepted = true;

    tip.save(["accepted"])
    .then(tip => {
        req.flash('success', 'Tip accepted successfully.');
        res.redirect('/quizzes/' + req.params.quizId);
    })
    .catch(error => {
        req.flash('error', 'Error accepting the tip: ' + error.message);
        next(error);
    });
};


// DELETE /quizzes/:quizId/tips/:tipId
exports.destroy = (req, res, next) => {

    req.tip.destroy()
    .then(() => {
        req.flash('success', 'tip deleted successfully.');
        res.redirect('/quizzes/' + req.params.quizId);
    })
    .catch(error => next(error));
};


//loads max number of credits allowed so that it doesnt have to be declared multiple times
exports.tip_preparation =(req,res,next)=>{
    let maxCredits=5;
    req.session.maxCredits=maxCredits;
    next();

};

// GET /quizzes/randomplay/randomtip

exports.randomtip = (req, res, next) => {

   let maxCredits=req.session.maxCredits;

   if (typeof req.session.tipsforquiz.creditsleft ==='undefined'){
        req.session.tipsforquiz.creditsleft=maxCredits;
    }


    let allTips=req.session.tipsforquiz.tips||[];
    let usedTips=req.session.usedTips||[];
    let count=req.session.tipsforquiz.tips.length;
    let index= Math.floor(Math.random() * count);



    if(usedTips.length===allTips.length){
        res.json({"nomore":true});
    }
    else {
        while (usedTips.includes(index)) {
            index = Math.floor(Math.random() * count);

        }

        let randomTip = allTips[index];
        usedTips.push(index);
        req.session.usedTips = usedTips;

        if (req.session.tipsforquiz.creditsleft > 0) {
            req.session.tipsforquiz.creditsleft--;

            res.json({
                "randomtip": randomTip,
                "creditsleft": req.session.tipsforquiz.creditsleft
            });

        }else{
            req.session.tipsforquiz.creditsleft = 0;
            res.json({
                "outofcredits": true
            });

        }

    }





};


