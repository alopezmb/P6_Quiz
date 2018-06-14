$(document).ready(function() {
    $("#addTip").click(function () {
        $.ajax({
            type: 'GET',
            url: '/quizzes/randomplay/randomtip',
            success: function (data) {
                if (typeof data.outofcredits !== 'undefined' && data.outofcredits === true) {
                    $('#addTip').replaceWith("<p class='magenta'>Out of credits =(</p>");
                }
                else if (typeof data.nomore !== 'undefined' && data.nomore === true) {
                    $('#addTip').replaceWith("<p class='magenta'>No more tips to show</p>");
                }
                else if (data.creditsleft !== 'undefined' && data.creditsleft >= 0) {

                    $('#credits').html(data.creditsleft);
                    $(".tipList").append('<li>' + data.randomtip.text +
                        '<small class="magenta"> &nbsp &nbsp(by '+data.randomtip.author.username+ ")"+'</small></li>');
                }


            }
        });
    });

});