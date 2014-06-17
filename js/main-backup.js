$(function () {

    function changeColor() { $('.control-item').css('background-color', $('.ui-tabs-active').css('background-color')); }
    $(document)
           .ready(function () { changeColor(); })
           .on('click', '#red, #yellow, #green', function () { changeColor(); });

	
	
    var colors = [];
    var levels = [];
    var categories = [];
    var snippets = [];

    var currentColorId = 0;
    var $currentColor = $('#color-0');
    var currentCategoryId = 0;
    var currentLevels = [0, 1]
    var currentSnippets = [];

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
        e.preventDefault();
        if (currentSnippets.length == 0) {
            return;
        }
        var body = generateEmailBody(true);
        document.location.href = "mailto:?body=" + body;
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

            // check if color and category combination links to any snippets
            $.each(snippets, function (i, snippet) {
                if ($.inArray(currentColorId, snippet.colors) > -1 && $.inArray(category.id, snippet.categories) > -1) {
                    showCategory = true;
                }
            });

            if (showCategory) {
                $('select#categories').append('<option value="' + category.id + '" ' + (currentCategoryId == category.id ? 'selected="selected"' : '') + '>' + category.name + '</option>');
            }
        });
		$('#categories').dropdown();
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
                $('<li' + ($.inArray(snippet, currentSnippets) > -1 ? ' class="selected"' : '') + '>' + snippet.text + '<span>' + levelStringForSnippet(snippet) + '</span></li>')
                    .data('id', snippet.id)
                    .appendTo($currentColor.find('.snippets'));
            }
        });
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
                var classes = 'snippet' + ' color-' + snippet.colorId + ' category-' + currentCategoryId;
                var $li = $('<li class="' + classes + '">' + snippet.text + '<span>' + levelStringForSnippet(snippet) + '</span></li>')
                    .data('id', snippet.id)
                    .appendTo($('#selections'));
                var $delete = $('<a class="delete" href="#"></a>')
                    .data('id', snippet.id)
                    .appendTo($li);
            });
        }
    }
	  $('#controls').on('click', '.cd-dropdown li', function () {
        currentCategoryId = parseInt($(this).attr('data-value'));
        console.log("current category: " + currentCategoryId);
        updateSnippets();
    });

    // ZeroClipboard
	var clip = new ZeroClipboard($("#copytoclipboard"), {
	    moviePath: "js/vendor/ZeroClipboard/ZeroClipboard.swf"
	});

	clip.on('load', function (client) {
	    console.log("Flash movie loaded and ready.");
	});

	clip.on('noFlash', function (client) {
	    console.log("Your browser has no Flash.");
	    $("#copytoclipboard").hide();
	});

	clip.on('wrongFlash', function (client, args) {
	    console.log("Flash 10.0.0+ is required but you are running Flash " + args.flashVersion.replace(/,/g, "."));
	    $("#copytoclipboard").hide();
	});

	clip.on('complete', function (client, args) {
	    console.log("Copied text to clipboard: " + args.text);
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
	    console.log('mousedown');
	});

	clip.on('mouseup', function (client) {
	    console.log('mouseup');
	});
});
		 
					 


