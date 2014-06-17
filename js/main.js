$(function () {

    function changeColor() { $('.control-item').css('background-color', $('.ui-tabs-active').css('background-color')); }
    $(document).ready(function () { changeColor(); tabLoop(); }).on('click', '#red, #yellow, #green', function () { changeColor(); });

    $("#help-word-count").fancybox({
        maxWidth: 600,
        maxHeight: 800,
        fitToView: false,
        width: '70%',
        height: '70%',
        autoSize: false,
        closeClick: false,
        openEffect: 'none',
        closeEffect: 'none'
    });

    var colors = [];
    var levels = [];
    var categories = [];
    var snippets = [];

    var currentColorId = 0;
    var $currentColor = $('#color-0');
    var currentCategoryId = -1;
    var currentLevels = [0, 1]
    var currentSnippets = [];

    var $wordCountElem = $('#word-count i');
    var lastWordCount = 0;
    var currentWordCount = 0;

    $.getJSON('data.json.txt')
    .done(function (data) {
        console.log(data);

        colors = data.colors;
        levels = data.levels;
        categories = data.categories;
        snippets = data.snippets;

        updateCategories();
        updateLevels();
        updateSnippets();
    });

    // color tabs
    $('#controls').tabs({
        activate: function (event, ui) {
            currentColorId = parseInt(ui.newPanel.attr('id').substring(6, 7));
            $currentColor = ui.newPanel;
            console.log("current color: " + currentColorId);
            updateCategories();
            updateSnippets();
        }
    });

    // category select
    $('select#categories').on('change', function () {
        currentCategoryId = parseInt(this.value);
        console.log("current category: " + currentCategoryId);
        updateSnippets();
    });

    // level checkboxes
    $('#levels').on('change', 'input[type="checkbox"]', function (e) {
        e.preventDefault();
        var levelId = parseInt($(this).val());
        if ($(this).is(':checked')) {
            currentLevels.push(levelId);
        } else {
            currentLevels.splice($.inArray(levelId, currentLevels), 1);
        }
        console.log("current levels: " + currentLevels);
        updateSnippets();
    });

    // snippets
    $('.snippets').on('click', 'li', function (e) {
        e.preventDefault();
        var selected = $(this).hasClass('selected');
        var snippetId = parseInt($(this).data('id'));
        updateSnippet(snippetId, selected);
        $(this).toggleClass('selected');

        // show/hide help message
        if (currentCategoryId != -1 && currentSnippets.length == 0) {
            $("#help1").hide();
            $("#help2").show();
            $("#word-count").hide();
        } else if (currentSnippets.length > 0) {
            $("#help1, #help2").hide();
            $("#word-count").show();
        }

    });

    var movingSnippetId, movingSnippet, movingSnippetOriginalIndex;
    $("#selections").sortable({
        start: function (event, ui) {
            movingSnippetId = parseInt(ui.item.data('id'));
            movingSnippetOriginalIndex = $("#selections li").index(ui.item);
            $.each(currentSnippets, function (i, snippet) {
                if (snippet.id == movingSnippetId) {
                    movingSnippet = snippet;
                }
            });
        },
        stop: function (event, ui) {
            var newIndex = $("#selections li").index(ui.item);
            currentSnippets.splice(movingSnippetOriginalIndex, 1);
            currentSnippets.splice(newIndex, 0, movingSnippet);
            updateSnippets();
        }
    });
    $("#selections").disableSelection();

    $('#selections').on('click', '.delete', function (e) {
        e.preventDefault();
        var snippetId = parseInt($(this).data('id'));
        updateSnippet(snippetId, true);
        updateSnippets();
    });

    // email generation

    $('#email').on('click', function (e) {
        var time = $.now();
        console.log(time);
        var digit = time % 10
        //if (digit == "3") {
            $("#surveyMessageBox").slideDown("slow");
        //}
        
        e.preventDefault();
        if (currentSnippets.length == 0) {
            return;
        }
        var body = generateEmailBody(true);
        pushData('Email');
        setTimeout(function () {
            document.location.href = "mailto:?body=" + body;
        }, 150);
    });

    

    function generateEmailBody(linebreaks) {
        linebreaks = linebreaks ? linebreaks : false;
        var body = "";
        if (currentSnippets.length > 0) {
            $.each(currentSnippets, function (i, snippet) {
                body = body + snippet.text + (linebreaks ? "%0D%0A%0D%0A" : "\r\n\r\n");
            });
        }
        return body;
    }

    function updateCategories() {
        // remove category options
        $('select#categories option').each(function (i) {
            if ($(this).val() > -1) {
                $(this).remove();
            }
        });
        // add category options
        $.each(categories, function (i, category) {
            var showCategory = false;

            // // check if color and category combination links to any snippets
            // $.each(snippets, function (i, snippet) {
            // if ($.inArray(currentColorId, snippet.colors) > -1 && $.inArray(category.id, snippet.categories) > -1) {
            // showCategory = true;
            // }
            // });

            // if (showCategory) {
            // $('select#categories').append('<option value="' + category.id + '" ' + (currentCategoryId == category.id ? 'selected="selected"' : '') + '>' + category.name + '</option>');
            // }

            $('select#categories').append('<option value="' + category.id + '" ' + (currentCategoryId == category.id ? 'selected="selected"' : '') + '>' + category.name + '</option>');

        });

        $('#categories').dropdown({
            stack: false
        });
    }

    function updateLevels() {
        // add level options
        $.each(levels, function (i, level) {
            $('#levels').append(
                '<label for="level-' + level.id + '">' + level.name +
                '<input type="checkbox" name="levels" id="level-' + level.id + '" value="' + level.id + '" ' + (($.inArray(level.id, currentLevels) > -1) ? 'checked="checked"' : '') + '/>' +
                '</label>');
        });
    }

    function updateSnippets() {

        // show/hide help message
        if (currentCategoryId != -1 && currentSnippets.length == 0) {
            $("#help1").hide();
            $("#help2").show();
            $("#word-count").hide();
        } else if (currentSnippets.length > 0) {
            $("#help1, #help2").hide();
            $("#word-count").show();
        }

        // remove snippet options
        $('.snippets').children().remove();
        // add snippet options for current level and category
        $.each(snippets, function (i, snippet) {
            var matchesLevel = false;

            // check if snippet matches current levels
            $.each(snippet.levels, function (i, snippetLevelId) {
                if ($.inArray(snippetLevelId, currentLevels) > -1) {
                    matchesLevel = true;
                }
            });

            if ($.inArray(currentColorId, snippet.colors) > -1 && $.inArray(currentCategoryId, snippet.categories) > -1 && matchesLevel) {
                //$('<li' + ($.inArray(snippet, currentSnippets) > -1 ? ' class="selected"' : '') + '>' + snippet.text + '<span>' + levelStringForSnippet(snippet) + '</span></li>')
                $('<li' + ($.inArray(snippet, currentSnippets) > -1 ? ' class="selected"' : '') + '>' + snippet.text + '</li>')
                .data('id', snippet.id)
                .appendTo($currentColor.find('.snippets'));
            }
        });
        tabLoop();

    }

    function updateSnippet(id, selected) {
        // get the snippet by id and either add or remove it from current snippets
        var currentSnippet;
        $.each(snippets, function (i, snippet) {
            if (snippet.id == id)
                currentSnippet = snippet;
        });

        if (currentSnippet == null) {
            alert('Oops! Try again.');
            return;
        }

        currentSnippet.colorId = currentColorId;

        if (!selected) {
            currentSnippets.push(currentSnippet);
        } else {
            currentSnippets.splice($.inArray(currentSnippet, currentSnippets), 1);
        }

        // update selected snippets
        updateSelections();
    }

    function levelStringForSnippet(snippet) {
        var levelString = "";
        // check if snippet matches current levels
        $.each(snippet.levels, function (i, snippetLevelId) {
            if (i > 0) levelString += ", ";
            $.each(levels, function (i, level) {
                if (level.id == snippetLevelId)
                    levelString += level.name;
            });
        });
        return levelString;
    }

    function updateSelections() {
        // remove selected snippets
        $('#selections').children().remove();
        // add seleted snippets to preview area
        if (currentSnippets.length > 0) {
            $.each(currentSnippets, function (i, snippet) {
                var classes = 'snippet' + ' color-' + snippet.colorId + ' category-' + currentCategoryId + ' id-' + snippet.id;;
                var $li = $('<li class="' + classes + '">' + snippet.text + '<span>' + levelStringForSnippet(snippet) + '</span></li>')
                .data('id', snippet.id)
                .appendTo($('#selections'));
                var $delete = $('<a class="delete" href="#"></a>')
                .data('id', snippet.id)
                .appendTo($li);
            });
        }

        updateWordCount();
    }

    $('#controls').on('click', '.cd-dropdown li', function () {
        currentCategoryId = parseInt($(this).attr('data-value'));
        console.log("current category: " + currentCategoryId);
        updateSnippets();
    });

    function updateWordCount() {
        currentWordCount = 0;
        if (currentSnippets.length > 0) {
            $.each(currentSnippets, function (i, snippet) {
                currentWordCount += snippet.text.split(" ").length;
            });
        }

        $({ someValue: lastWordCount }).animate({ someValue: currentWordCount }, {
            duration: 500,
            easing: 'swing',
            step: function () {
                $wordCountElem.text(commaSeparateNumber(Math.round(this.someValue)));
            },
            complete: function () {
                lastWordCount = currentWordCount;
                if (Math.round(this.someValue) > 62) {
                    $("#word-count").css("background", "#d51a07");
                    $("#word-count a").css("color", "#fff");
                } else if (Math.round(this.someValue) < 62 && Math.round(this.someValue) > 52) {
                    $("#word-count").css("background", "#ffc600");
                    $("#word-count a").css("color", "#fff");
                } else if (Math.round(this.someValue) < 52 && Math.round(this.someValue) > 40) {
                    $("#word-count").css("background", "#fff");
                    $("#word-count a").css("color", "#888");
                } else if (Math.round(this.someValue) < 40) {
                    $("#word-count").css("background", "#fff");
                    $("#word-count a").css("color", "#888");
                }
            }
        });
    }

    function commaSeparateNumber(val) {
        while (/(\d+)(\d{3})/.test(val.toString())) {
            val = val.toString().replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1,");
        }
        return val;
    }
    
   
    // ZeroClipboard
    var clip = new ZeroClipboard($("#copytoclipboard"), {
        moviePath: "js/vendor/ZeroClipboard/ZeroClipboard.swf"
    });

    clip.on('load', function (client) {
        console.log("Flash movie loaded and ready.");
    });

    clip.on('noFlash', function (client) {
        console.log("Your browser has no Flash.");
        $('#copytoclipboard').hide()
        $('#noFlashCopy').show()
    });

    clip.on('wrongFlash', function (client, args) {
        console.log("Flash 10.0.0+ is required but you are running Flash " + args.flashVersion.replace(/,/g, "."));
        $("#copytoclipboard").hide();
    });

    clip.on('complete', function (client, args) {
        console.log("Copied text to clipboard: " + args.text);
        pushData('Clipboard');
        if (args.text.length > 0)
            alert("The selected messages have been copied to your clipboard.");
    });

    clip.on('mouseover', function (client) {
        console.log('mouseover');
        var text = generateEmailBody(false);
        if (text.length > 0)
            clip.setText(text);
    });

    clip.on('mouseout', function (client) {
        console.log('mouseout');
    });

    clip.on('mousedown', function (client) {

        var time = $.now();
        var digit = time % 10
        if (digit == "3") {
           $("#surveyMessageBox").slideDown("slow");
        }
    
        console.log('mousedown');
    });

    clip.on('mouseup', function (client) {
        console.log('mouseup');
    });

    function pushData(method) {
        var selectedIDString = '';
        $.each(currentSnippets, function (i, snippet) {
            if (i != 0)
                selectedIDString += ','
            selectedIDString += snippet.id;
        });
        if (selectedIDString == '')
            return;
        console.log('blah = ' + selectedIDString);
        _gaq.push(['_trackEvent', 'SelectedIDs', method, selectedIDString]);
        return true;
    }
    $(document).on('click', '#noFlashCopy', function (e) {
        
        e.preventDefault();
        pushData('Clipboard');
        setTimeout(function () {
            var stuffToCopy = '';
            $('#selections li').each(function () { stuffToCopy += $(this).html(); });
            $('#noFlashCopy').fancybox({
                fitToView: false,
                width: '70%',
                height: '70%',
                autoSize: false,
                closeClick: false,
                openEffect: 'none',
                closeEffect: 'none',
                content: stuffToCopy
            });
        }, 150);
    });
});





/***************************************
TIPSY TOOLTIPS
****************************************/
function getTipsy() {
    $('.tipsy-n').tipsy({ gravity: 'n', opacity: 1 });
    $('.tipsy-e').tipsy({ gravity: 'e', opacity: 1 });
    $('.tipsy-s').tipsy({ gravity: 's', opacity: 1 });
    $('.tipsy-w').tipsy({ gravity: 'w', opacity: 1 });
    $('.tipsy-ne').tipsy({ gravity: 'ne', opacity: 1 });
    $('.tipsy-nw').tipsy({ gravity: 'nw', opacity: 1 });
    $('.tipsy-se').tipsy({ gravity: 'se', opacity: 1 });
    $('.tipsy-sw').tipsy({ gravity: 'sw', opacity: 1 });
}
getTipsy();


/**********************************
    vvv Keyboard navigation code vvv
    ***********************************/

/*Tab and Arrow Behavior*/

//tabbing into menu should open it
$(".control-item").on("focus", function () {
    if (!($(this).find(".cd-dropdown").hasClass("cd-active"))) {
        $(this).find("span").first().trigger("mousedown");
    }
    tabLoop();
});



//disable default tab keyboard behavior so we can extend it to all elements
$.widget("ui.tabs", $.ui.tabs, {
    options: {
        keyboard: true
    },
    _tabKeydown: function (e) {
        if (this.options.keyboard) {
            this._super('_tabKeydown');
        } else {
            return false;
        }
    }
});

//navigation
$(document).on("keydown", function (e) {

    /*
    on keydown e.which equals...
    left arrow: 37
    up arrow: 38
    right arrow: 39
    down arrow: 40
    tab: 9
    */

    if (e.which === 37 || e.which === 38 || e.which === 39 || e.which === 40 || e.which === 9) {
        //close menu if needed
        if (($(".control-item").first().find(".cd-dropdown").hasClass("cd-active"))) {
            if (e.which === 37 || e.which === 39) {
                $(".control-item").first().find("span").first().trigger("mousedown");
            } else if (((e.which === 38) || (e.which === 9 && e.shiftKey)) && $(".control-item").first()[0] === document.activeElement) {
                $(".control-item").first().find("span").first().trigger("mousedown");
            } else if (((e.which === 40) || (e.which === 9 && !e.shiftKey)) && $(".control-item").first().find("li").last()[0] === document.activeElement) {
                $(".control-item").first().find("span").first().trigger("mousedown");
            }
        }
        if (e.which === 37 || e.which === 38 || e.which === 39 || e.which === 40) {
            var index = parseInt($(document.activeElement).attr("tabindex"));
            var type = new Object();
            if (!(isNaN(index) || typeof index == 'undefined')) {
                type.isTab = (index >= 1000 && index < 2000);
                type.isDropdown = (index >= 2000 && index < 3000);
                type.isSnippet = (index >= 3000 && index < 4000);
                type.isAction = (index >= 4000 && index < 5000);
                type.isDelete = (index >= 5000 && index < 6000);
            } else {     //just go to selected tab
                $(".ui-tabs-active").first().find("a").first().focus();
                return false;
            }
            //back 1
            if ((e.which === 37 && (type.isTab || type.isAction)) || (e.which === 38 && (type.isDropdown || type.isSnippet || type.isDelete))) {
                var newIndex = index - 1;
                if (isNaN(newIndex) || newIndex === 0)
                    newIndex = 1000;
                if (!$("[tabindex=" + newIndex + "]").length) {//skip set
                    newIndex = index - 1000 - (index % 1000);
                    if (!$("[tabindex=" + newIndex + "]").length)//skip another set
                        newIndex = newIndex - 1000;
                }
                if ((!type.isTab) && newIndex >= 1000 && newIndex < 2000) {//don't want to reset tabs
                    $(".ui-tabs-active").first().find("a").first().focus();
                } else {
                    $("[tabindex=" + newIndex + "]").focus();
                }
                e.preventDefault();
            }
            //back set
            if ((e.which === 38 && (type.isTab || type.isAction)) || (e.which === 37 && (type.isDropdown || type.isSnippet || type.isDelete))) {
                var newIndex = index - 1000 - (index % 1000);
                if (isNaN(newIndex) || newIndex === 0)
                    newIndex = 1000;
                if (!$("[tabindex=" + newIndex + "]").length) {//skip set
                    newIndex = newIndex - 1000;
                }
                if (newIndex >= 1000 && newIndex < 2000) {//don't want to reset tabs
                    $(".ui-tabs-active").first().find("a").first().focus();
                } else {
                    $("[tabindex=" + newIndex + "]").focus();
                }
                e.preventDefault();
            }
            //forward 1
            if ((e.which === 39 && (type.isTab || type.isAction)) || (e.which === 40 && (type.isDropdown || type.isSnippet || type.isDelete))) {
                var newIndex = index + 1;
                if (isNaN(newIndex) || newIndex === 0)
                    newIndex = 1000;
                if (!$("[tabindex=" + newIndex + "]").length) {//skip set
                    newIndex = index + 1000 - (index % 1000);
                    if (!$("[tabindex=" + newIndex + "]").length)//skip another set
                        newIndex = newIndex + 1000;
                }
                $("[tabindex=" + newIndex + "]").focus();
                e.preventDefault();
            }
            //forward set
            if ((e.which === 40 && (type.isTab || type.isAction)) || (e.which === 39 && (type.isDropdown || type.isSnippet || type.isDelete))) {
                var newIndex = index + 1000 - (index % 1000);
                if (isNaN(newIndex) || newIndex === 0)
                    newIndex = 1000;
                if (!$("[tabindex=" + newIndex + "]").length) {//skip set
                    newIndex = newIndex + 1000;
                }
                $("[tabindex=" + newIndex + "]").focus();
                e.preventDefault();
            }
            tabLoop();
        }
    }
});

/* Enter key Behavior */


//enter triggers click for dropdown
$('#controls').on('keydown', '.cd-dropdown li', function (e) {
    if (e.which === 13) {
        $(this).click();
        $(".snippets li").first().focus();
        e.preventDefault();
    }
});

//enter triggers click for dropdown
$('.snippets').on('keypress', 'li', function (e) {
    if (e.which === 13) {
        $(this).click();
        tabLoop(); //get word count in loop
        e.preventDefault();
    }
});

//(note: enter functionality for copy to clipboard is not functional yet due to flash restrictions. Inital attempt at a fix is below, but is buggy)
/*
    $(document).on('keyup', '#copytoclipboard', function (e) {
      if (e.which === 13) {  
            var stuffToCopy = '';
            $('#selections li').each(function () { stuffToCopy += $(this).html(); });
            $('#copytoclipboard').fancybox({
                id:"fancybox-inner",
                fitToView: false,
                width: '70%',
                height: '70%',
                autoSize: false,
                closeClick: false,
                openEffect: 'none',
                closeEffect: 'none',
                content: stuffToCopy
                });
                SelectText("fancybox-inner");


        }
    });
*/

/*Set Tabindexes and other Enter Key Behavior*/

function tabLoop() {
    //set others out of loop
    $("[tabindex=0], .cd-dropdown li").attr('tabindex', -1);
    //add what we want in the tab order- groups up the index by a factor
    $("#home").filter(":visible").each(function (i) { $(this).attr('tabindex', i + 1); });
    $(".ui-tabs-anchor").filter(":visible").each(function (i) { $(this).attr('tabindex', i + 1000); });
    $(".control-item, .cd-active li, .snippets li").filter(":visible").each(function (i) { $(this).attr('tabindex', i + 2000); });
    $(".snippets li").filter(":visible").each(function (i) { $(this).attr('tabindex', i + 3000); });
    $("#actions a").filter(":visible").each(function (i) { $(this).attr('tabindex', i + 4000); });
    $("#help-word-count, .delete").filter(":visible").each(function (i) { $(this).attr('tabindex', i + 5000); });



    //if delete with keyboard stay focused in note
    $('.delete').off('keydown');
    $('.delete').on('keydown', function (e) {
        if (e.which === 13) {
            $(this).click();
            $(".delete").first().focus();
            e.preventDefault();
        }
    });

    //allow getting out of fancy box easily
    $("#help-word-count").off('keydown');
    $('#help-word-count').on('keydown', function (e) {
        if (e.which === 13) {
            $(this).click();
            $(".fancybox-close").first().focus();
            e.preventDefault();
        }
    });

    //unset and reapply focus behavior to tabs
    $(".ui-tabs-anchor").off("focus");
    $(".ui-tabs-anchor").on("focus", function () {
        $(this).click();
    });

    //sometimes tabindex of menu seems to stick around, if you tab in this will open the dropdown
    $(".cd-dropdown li").off("focus");
    $(".cd-dropdown li").on("focus", function () {
        if (!$(".control-item").first().find(".cd-dropdown").hasClass("cd-active")) {
            $(".control-item").first().find("span").first().trigger("mousedown");
        }
    });
}

