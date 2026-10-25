/**
 * site-interactive.js
 * Decoupled interactive behaviors for indexGin's blog
 * (Search modal, Side catalog generator, Multilingual switcher, Mermaid diagrams)
 */

// 1. Search Utilities & SimpleJekyllSearch Integration
function htmlDecode(input) {
    var e = document.createElement('textarea');
    e.innerHTML = input;
    return e.childNodes.length === 0 ? "" : e.childNodes[0].nodeValue;
}

if (document.getElementById('search-input') && typeof SimpleJekyllSearch !== 'undefined') {
    SimpleJekyllSearch({
        searchInput: document.getElementById('search-input'),
        resultsContainer: document.getElementById('search-results'),
        json: '/search.json',
        searchResultTemplate: '<div class="post-preview item"><a href="{url}"><h2 class="post-title">{title}</h2><h3 class="post-subtitle">{subtitle}</h3><hr></a></div>',
        noResultsText: 'No results',
        limit: 50,
        fuzzy: false,
        templateMiddleware: function (prop, value, template) {
            if (prop === 'subtitle' || prop === 'title') {
                if (value && value.indexOf("code") !== -1) {
                    return htmlDecode(value);
                } else {
                    return value;
                }
            }
        }
    });

    if (window.jQuery) {
        $(document).ready(function () {
            var $searchPage = $('.search-page');
            var $searchOpen = $('.search-icon');
            var $searchClose = $('.search-icon-close');
            var $searchInput = $('#search-input');
            var $body = $('body');

            $searchOpen.on('click', function (e) {
                e.preventDefault();
                $searchPage.toggleClass('search-active');
                var prevClasses = $body.attr('class') || '';
                setTimeout(function () {
                    $body.addClass('no-scroll');
                }, 400);

                if ($searchPage.hasClass('search-active')) {
                    $searchClose.on('click', function (e) {
                        e.preventDefault();
                        $searchPage.removeClass('search-active');
                        $body.attr('class', prevClasses);
                    });
                    $searchInput.focus();
                }
            });
        });
    }
}

// 2. Side Catalog Generation (For Post Detail Pages)
function generateCatalog(selector) {
    if (!window.jQuery) return false;
    var $container = $('div.post-container.active').length > 0 
        ? $('div.post-container.active') 
        : $('div.post-container');

    var headers = $container.find('h1,h2,h3,h4,h5,h6');
    if (headers.length === 0) return false;

    var $catalog = $(selector);
    $catalog.html('');

    headers.each(function () {
        var tag = $(this).prop('tagName').toLowerCase();
        var id = "#" + $(this).prop('id');
        var text = $(this).text();
        var link = $('<a href="' + id + '" rel="nofollow">' + text + '</a>');
        var item = $('<li class="' + tag + '_nav"></li>').append(link);
        $catalog.append(item);
    });
    return true;
}

if (document.querySelector('.catalog-body') && window.jQuery) {
    generateCatalog(".catalog-body");

    $(".catalog-toggle").click(function (e) {
        e.preventDefault();
        $('.side-catalog').toggleClass("fold");
    });

    if (typeof async === 'function') {
        async("/js/jquery.nav.js", function () {
            if ($.fn.onePageNav) {
                $('.catalog-body').onePageNav({
                    currentClass: "active",
                    changeHash: !1,
                    easing: "swing",
                    filter: "",
                    scrollSpeed: 700,
                    scrollOffset: 0,
                    scrollThreshold: .2,
                    padding: 80
                });
            }
        });
    }
}

// 3. Multilingual Support
if (document.querySelector(".zh") && document.querySelector(".en")) {
    var $zh = document.querySelector(".zh");
    var $en = document.querySelector(".en");
    var $select = document.querySelector("select");

    function getLang() { 
        return new URLSearchParams(document.location.search).get("lang"); 
    }

    function setLang(newLang) {
        var params = new URLSearchParams(document.location.search);
        params.set("lang", newLang);
        document.location.search = params.toString();
    }

    function _render() {
        var lang = getLang();
        if (lang === "en") {
            if ($select) $select.selectedIndex = 1;
            $en.style.display = "block";
            $en.classList.add("active");
            $zh.style.display = "none";
            $zh.classList.remove("active");
        } else {
            if ($select) $select.selectedIndex = 0;
            $zh.style.display = "block";
            $zh.classList.add("active");
            $en.style.display = "none";
            $en.classList.remove("active");
        }
        if (typeof generateCatalog === 'function') {
            generateCatalog(".catalog-body");
        }
    }

    window.onLanChange = function(index) {
        setLang(index === 0 ? "zh" : "en");
    };

    _render();
}

// 4. Mermaid.js Responsive Architecture Diagram Support
document.addEventListener("DOMContentLoaded", function () {
    var mermaidBlocks = document.querySelectorAll('.language-mermaid');
    if (mermaidBlocks.length > 0) {
        mermaidBlocks.forEach(function (block) {
            var code = block.querySelector('code') ? block.querySelector('code').textContent : block.textContent;
            var chart = document.createElement('div');
            chart.className = 'mermaid-wrap';
            var inner = document.createElement('div');
            inner.className = 'mermaid';
            inner.textContent = code;
            chart.appendChild(inner);
            block.parentNode.replaceChild(chart, block);
        });

        function initMermaid() {
            var isDark = document.documentElement.getAttribute('data-theme') !== 'light';
            mermaid.initialize({
                startOnLoad: false,
                theme: isDark ? 'dark' : 'default',
                themeVariables: {
                    fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
                    fontSize: '13px'
                },
                flowchart: {
                    useMaxWidth: true,
                    htmlLabels: true,
                    curve: 'basis'
                }
            });
            mermaid.run();
        }

        if (typeof mermaid === 'undefined') {
            var s = document.createElement('script');
            s.src = "https://cdn.jsdelivr.net/npm/mermaid@10.9.1/dist/mermaid.min.js";
            s.onload = initMermaid;
            document.head.appendChild(s);
        } else {
            initMermaid();
        }
    }
});
