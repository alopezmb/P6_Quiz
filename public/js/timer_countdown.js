
$(document).ready(function() {
    var interval = 1000 * 1;
    var quiztimer = function () {
        $.ajax({
            type: 'GET',
            url: '/quizzes/randomplay/countdown',
            success: function (data) {
                $('#countdown').html(data.count);

                if (data.count === 0) {
                    clearInterval(ajax_call);
                    window.location = '/quizzes/randomplay/timeup';
                }

            }
        });
    };
    var ajax_call = setInterval(quiztimer, interval);

});