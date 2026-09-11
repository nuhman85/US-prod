jQuery(document).ready(function () {
    let configs = [
        {
            countryCode: 'USA',
            apiPath: 'GetAutoSuggestionSearchItems',
            nvalue: 710661,
            startDate: '2024/7/8',
            endDate: '2024/7/15',
            name: 'FantasTech Presale'
        },
        {
            countryCode: 'CAN',
            apiPath: 'GetAutoSuggestionSearchItems',
            nvalue: 710662,
            startDate: '2024/7/8',
            endDate: '2024/7/15',
            name: 'FantasTech Presale'
        },
        {
            countryCode: 'USA',
            apiPath: 'GetAutoSuggestionSearchItems',
            nvalue: 701137,
            startDate: '2025/7/7',
            endDate: '2025/7/13',
            name: 'FantasTech Sale'
        },
        {
            countryCode: 'CAN',
            apiPath: 'GetAutoSuggestionSearchItems',
            nvalue: 700425,
            startDate: '2025/7/7',
            endDate: '2025/7/13',
            name: 'FantasTech Sale'
        },

        {
            countryCode: 'USA',
            apiPath: 'GetAutoSuggestionSearchItems',
            nvalue: 709447,
            name: 'Newegg Deals'
        },
        {
            countryCode: 'CAN',
            apiPath: 'GetAutoSuggestionSearchItems',
            nvalue: 709447,
            name: 'Newegg Deals'
        }
    ]
    let timeoutRequest;
    let intervalShow;
    let intervalCheckShow;
    let enableCheckJssResult = true;
    let inputValue = '';
    let countryCode = getCountry();
    let config = findConfig();
    if (config == null) {
        return;
    }
    jQuery('.header2021-search-box input[type="search"]').off('input').on('input', function () {
        clearInterval(intervalShow);
        clearInterval(intervalCheckShow);
        clearTimeout(timeoutRequest);
        timeoutRequest = setTimeout(function () {
            inputValue = jQuery('.header2021-search-box input[type="search"]').val().trim();
            if (inputValue) {
                checkAndShowNeweggDealsLink();
            }
        }, 500);
    }).on('blur', function () {
        clearInterval(intervalShow);
        clearInterval(intervalCheckShow);
    });

    function checkAndShowNeweggDealsLink() {
        if (enableCheckJssResult) {
            jQuery.ajax({
                url: `${getWWWHost()}/api/Common/${config.apiPath}?NValue=${config.nvalue}&searchKeyWords=${encodeURIComponent(inputValue)}&CountryCode=${countryCode}`,
                method: 'GET',
                dataType: 'json',
                success: function (response) {
                    if (response && response.TotalItemCount > 0) {
                        showNeweggDealsLink();
                    }
                },
                error: function (xhr, status, error) {
                    console.error(error);
                }
            });
        } else {
            showNeweggDealsLink();
        }
    }

    function showNeweggDealsLink() {
        clearInterval(intervalShow);
        intervalShow = setInterval(function () {
            //Check model search
            if (document.querySelector("#modq")) {
                return;
            }
            var _a, _b, _c, _d, _e;
            const isShowMatchingKeywords = ((_a = document.querySelector(
                '.header2021-search.is-active div.menu-body div.section-title-text')) === null ||
                _a === void 0 ? void 0 : _a.innerHTML) == 'Matching Keywords';
            const ulEle = document.querySelector(
                '.header2021-search.is-active div.menu-body div.menu-list ul.scrollbar');
            if (ulEle && isShowMatchingKeywords) {
                var safeInput = inputValue.replace(/<script.*?>.*?<\/script>/gi, '').replace(/on\w+=".*?"/gi, '')
                    .replace(/</g, "&lt;")
                    .replace(/>/g, "&gt;")
                    .replace(/'/g, "&#39;")
                    .replace(/&/g, "&amp;")
                    ;
                (_c = (_b = jQuery(
                    '.header2021-search.is-active div.menu-body div.menu-list ul.scrollbar>li>a.bg-color-red'
                )) === null || _b === void 0 ? void 0 : _b.parent()) === null || _c === void 0 ? void 0 :
                    _c.hide();
                (_e = (_d = jQuery(
                    '.header2021-search.is-active div.menu-body div.menu-list ul.scrollbar>li>a.newegg-deals'
                )) === null || _d === void 0 ? void 0 : _d.parent()) === null || _e === void 0 ? void 0 :
                    _e.remove();
                const insertHtml =
                    `<li><a href="${getWWWHost()}/p/pl?d=${encodeURIComponent(inputValue)}&n=${config.nvalue}&Order=3" class="menu-list-link bg-transparent-lightblue newegg-deals" title="See "${encodeURIComponent(inputValue)}" in ${config.name}" style="color:#FF0048"><div>See "<em>${safeInput}</em>" in ${config.name}</div></a></li>`;
                jQuery(ulEle).prepend(insertHtml);
                clearInterval(intervalShow);
                checkNeweggDealsLinkShow();
            } else {
                clearInterval(intervalCheckShow);
            }
        }, 100);
    }
    function checkNeweggDealsLinkShow() {
        clearInterval(intervalCheckShow);
        intervalCheckShow = setInterval(function () {
            var _a, _b;
            (_b = (_a = jQuery(
                '.header2021-search.is-active div.menu-body div.menu-list ul.scrollbar>li>a.bg-color-red'
            )) === null || _a === void 0 ? void 0 : _a.parent()) === null || _b === void 0 ? void 0 :
                _b.hide();
            const $showLinkElement = $(
                '.header2021-search.is-active div.menu-body div.menu-list ul.scrollbar>li>a.newegg-deals'
            );
            if (!$showLinkElement.length) {
                clearInterval(intervalCheckShow);
                showNeweggDealsLink();
            }
        }, 100);
    }

    function getWWWHost() {
        var _a, _b, _c;
        return `${document.location.protocol}//${(_c = (_b = (_a = window) === null || _a === void 0 ? void 0 : _a.__neweggState__) === null || _b === void 0 ? void 0 : _b.domains) === null || _c === void 0 ? void 0 : _c.WWW}`;
    }

    function getCountry() {
        var _a, _b, _c;
        return (_c = (_b = (_a = window) === null || _a === void 0 ? void 0 : _a.__neweggState__) === null ||
            _b === void 0 ? void 0 : _b.country) === null || _c === void 0 ? void 0 : _c.alpha3;
    }

    function compareDate(start, end) {
        var nowDate = new Date();
        start = new Date(start);
        end = new Date(end);
        return nowDate >= start && nowDate <= end;
    }

    function findConfig() {
        for (var i = 0; i < configs.length; i++) {
            if (configs[i].countryCode != countryCode) {
                continue;
            }
            if (configs[i].startDate || configs[i].endDate) {
                let sd = (configs[i].startDate || '2020/1/1');
                let ed = (configs[i].endDate || '2124/1/1');
                if (!compareDate(sd, ed)) {
                    continue;
                }
            }
            return configs[i];
        }

        return null;
    }
});