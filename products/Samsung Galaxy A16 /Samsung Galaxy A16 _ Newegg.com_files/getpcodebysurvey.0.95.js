jQuery(function () {
    var _MOUSE_CARD = [{ key: "5BD0ED41", promoText: "Get an extra discount by telling us what mouse you use" }];
    var _HEADSET_CARD = [{ key: "DA5C2A05", promoText: "Get an extra discount by telling us what headset you use" }];
    var _KEYBOARD_CARD = [{ key: "251C220A", promoText: "Get an extra discount by telling us what keyboard you use" }];
    var _ROUTER_CARD = [{ key: "9A4BB042", promoText: "Get an extra discount by telling us what router you use" }];
    var _ROUTER_DEFAULT = [{ key: "36180FB5", promoText: "Get an extra discount by telling us what router you use " }];

    var _keyStatusCache = {};
    var _endpointIndex = 0;
    var _statusEndpoints = ["https://www.newegg.com/api/common/CheckSurveyCodeStatus", "https://www.newegg.com/api/common/CheckSurveyCodeStatus1"];

    function parseLADate(str) {
        // Converts "YYYY-MM-DDTHH:mm:ss" (LA timezone, no offset) to a UTC Date
        var d = new Date(str);
        var diff = d - new Date(d.toLocaleString("en-US", { timeZone: "America/Los_Angeles" }));
        return new Date(d.getTime() + diff);
    }

    function isInLADateRange(startStr, endStr, now) {
        var start = /^\d{4}-\d{2}-\d{2}$/.test(startStr) ? startStr + "T00:00:00" : startStr;
        var end = /^\d{4}-\d{2}-\d{2}$/.test(endStr) ? endStr + "T23:59:59" : endStr;
        var current = now || new Date();
        return current >= parseLADate(start) && current <= parseLADate(end);
    }

    // schedules: [{ date, promoText }] or [{ start, end, promoText }]; first match wins
    function pickScheduledPromoText(schedules, defaultText) {
        for (var i = 0; i < schedules.length; i++) {
            var s = schedules[i];
            var start = s.start || s.date;
            var end = s.end || s.date;
            if (start && end && isInLADateRange(start, end)) return s.promoText;
        }
        return defaultText;
    }

    function checkKeyStatus(key) {
        if (!_keyStatusCache[key]) {
            var endpoint = _statusEndpoints[_endpointIndex++ % _statusEndpoints.length];
            _keyStatusCache[key] = fetch(endpoint + "?hashcode=" + key, { headers: { Accept: "application/json" } })
                .then(function (r) {
                    return r.ok ? r.json() : Promise.reject();
                })
                .then(function (res) {
                    var data = typeof res === "string" ? JSON.parse(res) : res;
                    var now = new Date();
                    return now >= parseLADate(data.StartDate) && now <= parseLADate(data.EndDate);
                })
                .catch(function () {
                    return false;
                });
        }
        return _keyStatusCache[key];
    }

    async function checkKeysBatched(keys, batchSize) {
        for (var i = 0; i < keys.length; i += batchSize) {
            await Promise.all(keys.slice(i, i + batchSize).map(checkKeyStatus));
        }
    }

    // Gift/free promo copy should stay visible; survey promo goes on a new line.
    function isGiftPromoText(text) {
        return /free|gift/i.test(String(text || ""));
    }

    // Render promo text as: [icon] text [►]
    // Strip any trailing ">" / "►" from config text to avoid duplicate arrows.
    // Icon and arrow use inline-block + text-decoration:none so the link underline
    // does not run through them.
    function renderPromoText(text) {
        var body = String(text || "")
            .replace(/\s*[>►]\s*$/, "")
            .trim();
        var icon =
            '<img src="https://c1.neweggimages.com/webresource/Scripts/Others/Survey/icon-for-animation-layers_125.gif" alt="" ' +
            'style="height:16px;width:auto;vertical-align:middle;margin-right:4px;display:inline-block;text-decoration:none;">';
        var arrow = '<span style="display:inline-block;text-decoration:none;">&nbsp;&#9658;</span>';
        return icon + body + arrow;
    }

    /* __PRICE_PROMO_START__ */
    // PDP right-hand price column: the survey promo is rendered as a CTA button
    // under the price instead of a text link under the product title.
    var PDP_PRICE_ROUTES = { Product: 1, ProductWithoutKeyword: 1, ComboDetail: 1 };
    var PDP_PRICE_PROMO_TEXT = "Click to See Extra Discount";
    var PRICE_LIST_SELECTOR = "#newProductPageContent .product-buy-box .product-pane:not(.is-collapsed) > .product-price > ul.price";
    var PRICE_ANCHOR_SELECTOR = ".price-new-right, li.price-current, .price-current_2026";
    var SAVE_LABEL_SELECTOR = ".tag-list, li.price-save";
    var SAVE_LABEL_RE = /save\s*:/i;

    // Keeps the .asus_survey_link class so the shared click handler and
    // impression tracking pick this up without any extra wiring.
    // Inline styles override the theme: .tag.is-skewed .tag-text bolds the label
    // and the global a:hover turns it blue. The nudge offsets the underline so the
    // label still looks vertically centred in the tag.
    var PRICE_PROMO_LINK_STYLE = "color:#fff;font-weight:400;text-decoration:underline;position:relative;top:-1px;";

    function renderPricePromoButton(surveyKey) {
        return (
            '<div class="asus-survey-price-promo tag tag-s is-skewed bg-darkorange">' +
            '<a href="javascript:void(0)" class="asus_survey_link tag-text" data-survey-key="' +
            surveyKey +
            '" style="' +
            PRICE_PROMO_LINK_STYLE +
            '">' +
            PDP_PRICE_PROMO_TEXT +
            "</a></div>"
        );
    }

    // Only drop labels that actually read "Save: ...", so unrelated tags in the
    // same list (DEAL, Build to Order, ...) stay visible.
    function hideSaveLabels(priceList) {
        var nodes = priceList.querySelectorAll(SAVE_LABEL_SELECTOR);
        for (var i = 0; i < nodes.length; i++) {
            if (SAVE_LABEL_RE.test(nodes[i].textContent || "")) {
                nodes[i].style.display = "none";
            }
        }
    }

    // Sit directly under the price. The returns row is a fallback anchor because
    // older price markup does not expose a dedicated price container.
    function insertPricePromoButton(priceList, surveyKey) {
        if (!priceList) return false;
        if (priceList.querySelector(".asus_survey_link")) return true;
        var html = renderPricePromoButton(surveyKey);
        var priceRow = priceList.querySelector(PRICE_ANCHOR_SELECTOR);
        var returnRow = priceList.querySelector("li.product-return-wrap");
        if (priceRow) {
            priceRow.insertAdjacentHTML("afterend", html);
        } else if (returnRow) {
            returnRow.insertAdjacentHTML("beforebegin", html);
        } else {
            priceList.insertAdjacentHTML("beforeend", html);
        }
        hideSaveLabels(priceList);
        return true;
    }
    /* __PRICE_PROMO_END__ */

    /* __LIST_PROMO_START__ */
    // ProductList / EventSaleStore: the CTA takes over the Save label's slot, so the
    // discount badge is replaced instead of duplicated, and neighbouring tags such as
    // "$15 Off w/ Code" survive.
    var LIST_PROMO_ROUTES = { ProductList: 1, EventSaleStore: 1 };
    var ESS_PROMO_TAG_CLASS = "tag is-skewed bg-darkorange tag-s asus-survey-price-promo";
    // The ribbon background and its slanted tail come from the theme's .price-save-*
    // rules, so only colour and underline are set here.
    var PLP_PROMO_LINK_STYLE = "color:#fff;text-decoration:underline;";

    function renderPlpPromoRibbon(surveyKey) {
        return (
            '<a href="javascript:void(0)" class="asus_survey_link" data-survey-key="' +
            surveyKey +
            '" style="' +
            PLP_PROMO_LINK_STYLE +
            '"><span class="price-save-label">' +
            PDP_PRICE_PROMO_TEXT +
            '</span><span class="price-save-percent"></span></a>'
        );
    }

    function renderEssPromoLink(surveyKey) {
        return (
            '<a href="javascript:void(0)" class="asus_survey_link tag-text" data-survey-key="' +
            surveyKey +
            '" style="' +
            PRICE_PROMO_LINK_STYLE +
            '">' +
            PDP_PRICE_PROMO_TEXT +
            "</a>"
        );
    }

    function findSaveTag(tagList) {
        var tags = tagList.querySelectorAll(".tag");
        for (var i = 0; i < tags.length; i++) {
            if (SAVE_LABEL_RE.test(tags[i].textContent || "")) return tags[i];
        }
        return null;
    }

    // Same gift/free check as the title-area insert path: keep those lines,
    // hide everything else. Nodes that already hold the survey link are skipped
    // so a leftover title injection is not taken down.
    function hideNonGiftNativePromo(card, selector) {
        if (!card) return;
        var nodes = card.querySelectorAll(selector);
        for (var i = 0; i < nodes.length; i++) {
            var node = nodes[i];
            if (typeof node.closest === "function" && node.closest(".goods-price")) continue;
            if (node.querySelector && node.querySelector(".asus_survey_link")) continue;
            if (/free|gift/i.test(node.textContent || "")) continue;
            if (!node.style) node.style = {};
            node.style.display = "none";
        }
    }

    // li.price-save sits right below the current price and exists even when the item
    // has no discount, so it doubles as the insertion point.
    function takeOverPlpSaveSlot(card, surveyKey) {
        if (!card) return false;
        if (!card.querySelector(".asus_survey_link")) {
            var slot = card.querySelector("ul.price > li.price-save");
            if (!slot) return false;
            slot.innerHTML = renderPlpPromoRibbon(surveyKey);
        }
        hideNonGiftNativePromo(card, ".item-promo");
        return true;
    }

    // The Save tag lives in .tag-list above the price.
    function takeOverEssSaveTag(card, surveyKey) {
        if (!card) return false;
        if (!card.querySelector(".asus_survey_link")) {
            var info = card.querySelector(".goods-info") || card;
            var tagList = info.querySelector(".tag-list");
            if (!tagList) {
                var price = info.querySelector(".goods-price");
                if (!price) return false;
                price.insertAdjacentHTML("beforebegin", '<div class="tag-list"></div>');
                tagList = info.querySelector(".tag-list");
            }
            var saveTag = findSaveTag(tagList);
            if (saveTag) {
                saveTag.className = ESS_PROMO_TAG_CLASS;
                saveTag.innerHTML = renderEssPromoLink(surveyKey);
            } else {
                tagList.insertAdjacentHTML("afterbegin", '<div class="' + ESS_PROMO_TAG_CLASS + '">' + renderEssPromoLink(surveyKey) + "</div>");
            }
        }
        hideNonGiftNativePromo(card, ".goods-promo");
        return true;
    }
    /* __LIST_PROMO_END__ */

    // The price column is server rendered, but observe anyway so a late hydration
    // pass does not make us fall back to the title area for nothing.
    function waitForPriceList(timeout) {
        return new Promise(function (resolve) {
            var existing = document.querySelector(PRICE_LIST_SELECTOR);
            if (existing) return resolve(existing);
            var done = false;
            var observer;
            var timer;
            var finish = function (node) {
                if (done) return;
                done = true;
                if (observer) observer.disconnect();
                clearTimeout(timer);
                resolve(node);
            };
            observer = new MutationObserver(function () {
                var node = document.querySelector(PRICE_LIST_SELECTOR);
                if (node) finish(node);
            });
            observer.observe(document.body, { childList: true, subtree: true });
            timer = setTimeout(function () {
                finish(null);
            }, timeout || 8000);
        });
    }

    const getPCodeBySurvey = {
        keyDict: {
            // Mouse
            "26-785-254": _MOUSE_CARD,
            "26-785-262": _MOUSE_CARD,
            "26-785-263": _MOUSE_CARD,
            "26-785-275": _MOUSE_CARD,
            "26-785-274": _MOUSE_CARD,
            "26-785-277": _MOUSE_CARD,
            "26-785-278": _MOUSE_CARD,
            // Headset
            "26-785-268": _HEADSET_CARD,
            "26-785-284": _HEADSET_CARD,
            "26-785-266": _HEADSET_CARD,
            "26-785-283": _HEADSET_CARD,
            "26-785-285": _HEADSET_CARD,
            "26-785-280": _HEADSET_CARD,
            // Keyboard
            "23-193-156": _KEYBOARD_CARD,
            "23-193-164": _KEYBOARD_CARD,
            "23-193-144": _KEYBOARD_CARD,
            "23-193-151": _KEYBOARD_CARD,
            "23-193-145": _KEYBOARD_CARD,
            "23-193-157": _KEYBOARD_CARD,
            "23-193-160": _KEYBOARD_CARD,
            "23-193-166": _KEYBOARD_CARD,
            "23-193-168": _KEYBOARD_CARD,
            "23-193-173": _KEYBOARD_CARD,
            // Individual promo
            "14-932-756": [{ key: "F4CEFDE2", promoText: "EXTRA DISCOUNT AVAILABLE. UNLOCK IT HERE " }],
            "14-932-769": [{ key: "4EAA2398", promoText: "EXTRA DISCOUNT AVAILABLE. UNLOCK IT HERE " }],
            "14-932-751": [
                {
                    key: "D30B8AC8",
                    promoText: pickScheduledPromoText(
                        [
                            { date: "2026-08-06", promoText: "SHELL SHOCKER DISCOUNT AVAILABLE. Unlock it here " },
                        ],
                        "EXTRA DISCOUNT AVAILABLE. UNLOCK IT HERE ",
                    ),
                },
            ],
            "14-932-768": [{ key: "1079C3B4", promoText: "EXTRA DISCOUNT AVAILABLE. UNLOCK IT HERE " }],
            "14-932-774": [{key: "01738254",promoText: "EXTRA DISCOUNT AVAILABLE. UNLOCK IT HERE " }],
            "14-932-771": [{key: "4C66C215",promoText: "EXTRA DISCOUNT AVAILABLE. UNLOCK IT HERE " }],
            "14-137-993": [{key: "B7EE24B3",promoText: "EXTRA DISCOUNT AVAILABLE. UNLOCK IT HERE " }],
            "14-137-976": [{ key: "2EED3ECB", promoText: "EXTRA DISCOUNT AVAILABLE. UNLOCK IT HERE " }],
            "14-500-638": [{key: "1BC2B942",promoText: "EXTRA DISCOUNT AVAILABLE. UNLOCK IT HERE " }],
            4871461: [{ key: "2EED3ECB", promoText: "EXTRA DISCOUNT AVAILABLE. UNLOCK IT HERE " }],
            "14-137-965": [{ key: "CB040459", promoText: "EXTRA DISCOUNT AVAILABLE. UNLOCK IT HERE " }],
            "14-932-754": [{key: "A61C98D0",promoText: "EXTRA DISCOUNT AVAILABLE. UNLOCK IT HERE " }],
            "14-137-957": [{key: "63B51834",promoText: "EXTRA DISCOUNT AVAILABLE. UNLOCK IT HERE " }],
            "14-137-978": [{ key: "AF475FE5", promoText: "EXTRA DISCOUNT AVAILABLE. UNLOCK IT HERE " }],
            "14-932-792": [{ key: "85D33534", promoText: "EXTRA DISCOUNT AVAILABLE. UNLOCK IT HERE " }],
            "14-932-793": [{ key: "AD43D96A", promoText: "EXTRA DISCOUNT AVAILABLE. UNLOCK IT HERE " }],
            "14-932-795": [{ key: "8BAF24D0", promoText: "EXTRA DISCOUNT AVAILABLE. UNLOCK IT HERE " }],
            "14-932-796": [{ key: "9ED57424", promoText: "EXTRA DISCOUNT AVAILABLE. UNLOCK IT HERE " }],
            "14-932-812": [{ key: "03AE6198", promoText: "EXTRA DISCOUNT AVAILABLE. UNLOCK IT HERE " }],
            // VGA FantasTech Survey
            "14-126-743": [{key: "6261279B",promoText: "EXTRA DISCOUNT AVAILABLE. UNLOCK IT HERE " }],
            "14-126-744": [{ key: "E56FAAE8", promoText: "EXTRA DISCOUNT AVAILABLE. UNLOCK IT HERE " }],
            "14-131-888": [{ key: "4232B8FA", promoText: "EXTRA DISCOUNT AVAILABLE. UNLOCK IT HERE " }],
            "14-137-905": [{key: "97F2FF0E",promoText: "EXTRA DISCOUNT AVAILABLE. UNLOCK IT HERE "}],
            "14-137-998": [{ key: "1B08D6CA", promoText: "EXTRA DISCOUNT AVAILABLE. UNLOCK IT HERE " }],
            "14-500-623": [{ key: "5BAEBB68", promoText: "EXTRA DISCOUNT AVAILABLE. UNLOCK IT HERE " }],
            "14-930-131": [{key: "31FF8AF4",promoText: "EXTRA DISCOUNT AVAILABLE. UNLOCK IT HERE " }],
            "14-982-013": [{key: "B77F2B3C",promoText: "EXTRA DISCOUNT AVAILABLE. UNLOCK IT HERE " }],
            "14-987-002": [
                { key: "2969D66E", 
                    promoText: pickScheduledPromoText(
                        [{ date: "2026-07-31", promoText: "SHELL SHOCKER DISCOUNT AVAILABLE. Unlock it here " }],
                        "EXTRA DISCOUNT AVAILABLE. UNLOCK IT HERE ",
                    ), 
                }],
            // 2CD9DCC7 runs through 8/22; A1891B1C takes over 8/23-9/30.
            "14-932-827": [
                { key: "2CD9DCC7", 
                    promoText: pickScheduledPromoText(
                        [{ date: "2026-08-14", promoText: "SHELL SHOCKER DISCOUNT AVAILABLE. Unlock it here " }],
                        "EXTRA DISCOUNT AVAILABLE. UNLOCK IT HERE ",
                    ), 
                },
                { key: "A1891B1C", promoText: "EXTRA DISCOUNT AVAILABLE. UNLOCK IT HERE " },
            ],
            "14-202-457": [{key: "501D9E88",promoText: "EXTRA DISCOUNT AVAILABLE. UNLOCK IT HERE " }],
            "14-932-753": [{key: "3A6B6739",promoText: "EXTRA DISCOUNT AVAILABLE. UNLOCK IT HERE " }],
            //CPU
            // "19-113-938": [
            //     { key: "677650BA", 
            //         promoText: pickScheduledPromoText(
            //             [{ date: "2026-08-15", promoText: "SHELL SHOCKER DISCOUNT AVAILABLE. Unlock it here " }],
            //             "EXTRA DISCOUNT AVAILABLE. UNLOCK IT HERE ",
            //         ), 
            //     }],
            "19-118-339": [{key: "5A544A3E",promoText: "EXTRA DISCOUNT AVAILABLE. UNLOCK IT HERE "}],
            "19-113-909": [{key: "4077F82C",promoText: "EXTRA DISCOUNT AVAILABLE. UNLOCK IT HERE "}],
            "19-113-910": [{key: "B980031D",promoText: "EXTRA DISCOUNT AVAILABLE. UNLOCK IT HERE "}],
            "19-113-912": [{key: "5937581E",promoText: "EXTRA DISCOUNT AVAILABLE. UNLOCK IT HERE "}],
            "19-113-913": [{key: "BC8BE6FA",promoText: "EXTRA DISCOUNT AVAILABLE. UNLOCK IT HERE "}],
            "19-113-914": [{key: "78349A78",promoText: "EXTRA DISCOUNT AVAILABLE. UNLOCK IT HERE "}],
            // Router
            "33-704-721": _ROUTER_CARD,
            "33-704-681": [{ key: "5714819B", promoText: "Get an extra discount by telling us what router you use" }],
            "33-704-717": _ROUTER_CARD,
            "33-704-809": _ROUTER_CARD,
            "33-704-810": _ROUTER_CARD,
            "33-704-829": _ROUTER_CARD,
            "33-704-711": _ROUTER_CARD,
            "33-704-771": _ROUTER_CARD,
            "33-704-745": _ROUTER_CARD,
            "33-704-752": _ROUTER_CARD,
            "33-704-658": _ROUTER_CARD,
            "33-704-665": _ROUTER_CARD,
            "33-704-668": _ROUTER_CARD,
            "0ED-000J-000T4": _ROUTER_CARD,
            "33-704-669": _ROUTER_CARD,
            "33-704-758": _ROUTER_CARD,
            "33-704-797": _ROUTER_CARD,
            "33-704-806": _ROUTER_CARD,
            "33-704-674": _ROUTER_CARD,
            "33-704-705": _ROUTER_CARD,
            "33-704-706": _ROUTER_CARD,
            "33-704-722": _ROUTER_CARD,
            "33-704-739": _ROUTER_CARD,
            "33-704-767": _ROUTER_CARD,
            "33-704-772": _ROUTER_CARD,
            "33-704-626": _ROUTER_CARD,
            "33-704-716": _ROUTER_CARD,
            // Router (default promo)
            "33-320-597": _ROUTER_DEFAULT,
            "33-320-596": _ROUTER_DEFAULT,
            "33-320-606": _ROUTER_DEFAULT,
            "33-320-605": _ROUTER_DEFAULT,
            "33-320-610": _ROUTER_DEFAULT,
            "33-320-611": _ROUTER_DEFAULT,
            "33-320-617": _ROUTER_DEFAULT,
            "33-320-613": _ROUTER_DEFAULT,
            "33-320-614": _ROUTER_DEFAULT,
            "33-320-615": _ROUTER_DEFAULT,
            "33-320-588": _ROUTER_DEFAULT,
            "33-320-632": _ROUTER_DEFAULT,
            "33-320-569": _ROUTER_DEFAULT,
            "33-320-598": _ROUTER_DEFAULT,
            "33-320-607": _ROUTER_DEFAULT,
            "33-320-608": _ROUTER_DEFAULT,
            "33-320-619": _ROUTER_DEFAULT,
            "33-320-609": _ROUTER_DEFAULT,
            "33-320-628": [{ key: "BC2928D6", promoText: "Get an extra discount by telling us what router you use" }],
        },
        get itemWhiteList() {
            return Object.keys(this.keyDict);
        },
        surveyKey: async function (item) {
            var cards = this.keyDict[item];
            if (!cards) return null;
            for (var i = 0; i < cards.length; i++) {
                if (await checkKeyStatus(cards[i].key)) return cards[i];
            }
            return null;
        },
        getSurveyHTML: async function (item) {
            var surveyCard = await getPCodeBySurvey.surveyKey(item);
            return surveyCard ? '<a href="javascript:void(0)" class="asus_survey_link" data-survey-key="' + surveyCard.key + '">' + renderPromoText(surveyCard.promoText) + "</a>" : "";
        },
        domConfig: {
            Product: {
                container: "h1.product-title",
                selector: "h2.product-promo",
                promoHtml: '<h2 class="product-promo">{surveyHTML}</h2>',
            },
            ProductWithoutKeyword: {
                container: "h1.product-title",
                selector: "h2.product-promo",
                promoHtml: '<h2 class="product-promo">{surveyHTML}</h2>',
            },
            ProductList: {
                container: "#{item} .item-title",
                selector: "#{item} .item-promo",
                promoHtml: '<p class="item-promo">{surveyHTML}</p>',
                card: "#{item}",
            },
            EventSaleStore: {
                container: 'div[data-itemnumber="{item}"] .goods-title',
                selector: 'div[data-itemnumber="{item}"] .goods-promo:not(.goods-price .goods-promo)',
                promoHtml: '<p class="goods-promo font-s text-darkorange">{surveyHTML}</p>',
                card: 'div[data-itemnumber="{item}"]',
            },
            DIYItemList: {
                container: "tr:has(img[src*='{item}']) .item-title>span",
                selector: "tr:has(img[src*='{item}']) .item-promo",
                promoHtml: '<p class="item-promo no-margin">{surveyHTML}</p>',
            },
            ComboDetail: {
                container: "h1.product-title",
                selector: "h2.product-promo",
                promoHtml: '<h2 class="product-promo">{surveyHTML}</h2>',
            },
        },
        handleMutationObserver: function (target, callback) {
            const observer = new MutationObserver(async (mutationsList, observer) => {
                for (let mutation of mutationsList) {
                    if (mutation.type === "childList") {
                        callback(mutation);
                        observer.disconnect();
                    }
                }
            });
            observer.observe(target, { childList: true });
        },
        initSurvey: function () {
            if (!window.neweggFeedback) {
                var timer = setInterval(() => {
                    if (!!window.neweggFeedback) {
                        getPCodeBySurvey._surveyReady = true;
                        clearInterval(timer);
                    }
                }, 1000);
                setTimeout(() => clearInterval(timer), 30000);
            } else {
                getPCodeBySurvey._surveyReady = true;
            }
        },
        _surveyInstances: {},
        getOrCreateSurveyInstance: function (surveyKey) {
            if (!window.neweggFeedback) return null;
            if (!getPCodeBySurvey._surveyInstances[surveyKey]) {
                getPCodeBySurvey._surveyInstances[surveyKey] = new neweggFeedback.NeweggSurvey({
                    cardType: "Id",
                    key: surveyKey,
                });
            }
            return getPCodeBySurvey._surveyInstances[surveyKey];
        },
        issueReport: function () {
            var FOOTER_ID = "pcode-survey-footer";

            function addFooterToPopup(popup) {
                var body = popup.querySelector(".centerPopup-body");
                if (!body) return;
                if (body.querySelector("#" + FOOTER_ID)) return;

                var footer = document.createElement("div");
                footer.id = FOOTER_ID;
                footer.style.cssText = "border-top: 1px solid #e8e8e8; margin-top: 10px; padding-top: 8px; text-align: center;";
                footer.innerHTML = '<span style="font-size: 13px;"> Having issues with the promo code? Let us know <a href="javascript:void(0)" class="asus_survey_link issue_report" data-survey-key="2F15EC56" style="text-decoration: underline;">here</a>. </span>';
                body.appendChild(footer);
            }

            var popupFooterObserver = new MutationObserver(function (mutations) {
                mutations.forEach(function (mutation) {
                    if (mutation.type === "attributes") {
                        var target = mutation.target;
                        if (target.classList && target.classList.contains("centerPopup") && target.classList.contains("is-current")) {
                            popupFooterObserver.disconnect();
                            setTimeout(function () {
                                addFooterToPopup(target);
                            }, 100);
                        }
                    }
                });
            });

            popupFooterObserver.observe(document.body, {
                subtree: true,
                attributes: true,
                attributeFilter: ["class", "style"],
            });
        },
        // PDP only: place the promo in the price column. Returns false when the
        // price column is missing so the caller can fall back to the title area.
        handlePricePromoInsertion: async function (item) {
            var surveyCard = await getPCodeBySurvey.surveyKey(item);
            if (!surveyCard) return false;
            var priceList = await waitForPriceList();
            if (!priceList) return false;
            var $titlePromo = jQuery("h2.product-promo");
            if ($titlePromo.length && !isGiftPromoText($titlePromo.first().text() || "")) {
                $titlePromo.remove();
            }
            return insertPricePromoButton(priceList, surveyCard.key);
        },
        // ProductList / EventSaleStore: returns false when the card or its Save slot
        // is missing so the caller can fall back to the promo line under the title.
        // The same item can appear in several carousels, so every match is handled.
        handleListPromoInsertion: async function (route, item) {
            var cardSelector = (getPCodeBySurvey.domConfig[route] || {}).card;
            if (!cardSelector) return false;
            var surveyCard = await getPCodeBySurvey.surveyKey(item);
            if (!surveyCard) return false;
            var $cards = jQuery(cardSelector.replace("{item}", item));
            if (!$cards.length) return false;
            var takeOver = route === "EventSaleStore" ? takeOverEssSaveTag : takeOverPlpSaveSlot;
            var placed = false;
            for (var i = 0; i < $cards.length; i++) {
                if (takeOver($cards[i], surveyCard.key)) placed = true;
            }
            return placed;
        },
        handlePromoInsertion: async function (route, itemList, domConfig) {
            if (!itemList.length) return;
            getPCodeBySurvey.initSurvey();
            getPCodeBySurvey.bindSurveyClick();

            if (!domConfig && PDP_PRICE_ROUTES[route] && (await getPCodeBySurvey.handlePricePromoInsertion(itemList[0]))) {
                getPCodeBySurvey.tracking();
                getPCodeBySurvey.issueReport();
                return;
            }

            const { container, selector, promoHtml } = domConfig || getPCodeBySurvey.domConfig[route];

            const BATCH_SIZE = 10;
            for (var b = 0; b < itemList.length; b += BATCH_SIZE) {
                var batch = itemList.slice(b, b + BATCH_SIZE);
                var batchKeys = [
                    ...new Set(
                        batch.flatMap(function (item) {
                            return (getPCodeBySurvey.keyDict[item] || []).map(function (c) {
                                return c.key;
                            });
                        }),
                    ),
                ];
                await Promise.all(batchKeys.map(checkKeyStatus));
                for (var i = 0; i < batch.length; i++) {
                    var item = batch[i];
                    if (!domConfig && LIST_PROMO_ROUTES[route] && (await getPCodeBySurvey.handleListPromoInsertion(route, item))) continue;
                    var surveyHTML = await getPCodeBySurvey.getSurveyHTML(item);
                    if (!surveyHTML) continue;
                    var $existing = jQuery(selector.replace("{item}", item));
                    // Skip if survey promo already injected (avoids duplicates on re-run).
                    if ($existing.find(".asus_survey_link").length || $existing.filter(":has(.asus_survey_link)").length) continue;
                    // Gift case inserts a sibling promo; also detect that.
                    if ($existing.next().find(".asus_survey_link").length || $existing.next().has(".asus_survey_link").length) continue;
                    var existingText = $existing.first().text() || "";
                    if ($existing.length && isGiftPromoText(existingText)) {
                        // Keep gift/free promo; append survey promo as a new line after it.
                        $existing.last().after(promoHtml.replace("{surveyHTML}", surveyHTML));
                    } else {
                        $existing.remove();
                        jQuery(container.replace("{item}", item)).after(promoHtml.replace("{surveyHTML}", surveyHTML));
                    }
                }
            }

            getPCodeBySurvey.tracking();
            getPCodeBySurvey.issueReport();
        },
        getPromotionItem: function (itemList) {
            return itemList.filter((e) => getPCodeBySurvey.itemWhiteList.includes(e.ItemCell?.Item)).map((e) => e.ItemCell?.Item);
        },
        getDiyItem: function (itemList) {
            return itemList.filter((e) => getPCodeBySurvey.itemWhiteList.includes(e.ItemNumber)).map((e) => e.ItemNumber);
        },
        bindSurveyClick: function () {
            if (getPCodeBySurvey._clickBound) return;
            getPCodeBySurvey._clickBound = true;
            // Use native capture phase so this fires before React/jQuery bubble-phase
            // handlers on ancestor elements, preventing unintended side-effects.
            document.addEventListener(
                "click",
                function (e) {
                    const popups = Array.from(document.querySelectorAll(".centerPopup.is-current"));
                    const activePopup = popups.find((p) => window.getComputedStyle(p).display === "block");

                    if (activePopup) {
                        const closeBtn = activePopup.querySelector(".centerPopup-close");
                        if (closeBtn) {
                            closeBtn.click();
                        }
                    }
                    var link = e.target.closest(".asus_survey_link");
                    if (!link) return;
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                    window?.__ga_push({
                        event: "legacy_click",
                        legacy_element_value: "asus_survey_link",
                    });
                    var surveyKey = link.dataset.surveyKey;
                    if (surveyKey) {
                        var inst = getPCodeBySurvey.getOrCreateSurveyInstance(surveyKey);
                        if (inst) inst.show();
                    }
                },
                true,
            ); // true = capture phase
        },
        tracking: function () {
            var useImpression = function (node, callback) {
                if (node) {
                    const observer = new IntersectionObserver(function (entries) {
                        if (entries[0].isIntersecting) {
                            observer.unobserve(node);
                            callback && callback(node);
                        }
                    });
                    observer.observe(node);
                }
            };
            var trackingDom = document.querySelectorAll(".asus_survey_link");
            trackingDom?.forEach(function (element) {
                useImpression(element, function () {
                    window?.__ga_push({
                        event: "legacy_view",
                        legacy_element_value: "asus_survey_link",
                    });
                });
            });
        },
    };

    async function fixVGAOptions(itemList) {
        var vgaItems = itemList.filter((item) => item.indexOf("14-") === 0);
        if (!vgaItems.length) return;

        const ITEM_NUMBER_RE = /^\d{2}-\d{3}-\d{3}$/;
        const DEAL_TAG_HTML = '<div class="form-deals-list"><div class="form-tag-deals"><span>DEAL</span></div></div>';

        const optionEls = [...document.querySelectorAll(".form-option-item[data-parent]")];
        const itemNumbers = [...new Set(optionEls.map((el) => el.getAttribute("data-parent")).filter((p) => p && vgaItems.includes(p)))];

        if (!itemNumbers.length) {
            //console.warn('[promoSync] No options with data-parent found, skipping VGA promo insertion');
            return;
        }

        var uniqueKeys = [...new Set(itemNumbers.flatMap((item) => (getPCodeBySurvey.keyDict[item] || []).map((c) => c.key)))];
        const [priceData] = await Promise.all([
            fetch(`https://www.newegg.com/api/common/MasksItemOnNewCart?CountryCode=USA&items=${itemNumbers.join(",")}`)
                .then((res) => res.json())
                .catch(() => []),
            await checkKeysBatched(uniqueKeys, 10),
        ]);

        const priceMap = {};
        priceData.forEach((item) => {
            if (item.Item) {
                priceMap[item.Item] = (item.UnitCost || 0) - (item.InstantRebateAmount || 0);
            }
        });

        const itemNumberSet = new Set(itemNumbers);
        const relevantEls = optionEls.filter((el) => {
            const dataParent = el.getAttribute("data-parent");
            const dataItem4build = el.getAttribute("data-item4build");
            return itemNumberSet.has(dataParent) && !ITEM_NUMBER_RE.test(dataItem4build);
        });

        for (const el of relevantEls) {
            const dataParent = el.getAttribute("data-parent");
            const li = el.closest("li");
            const cb = li?.querySelector("input");
            const priceStrong = el.querySelector(".form-checkbox-title strong");

            const surveyCard = await getPCodeBySurvey.surveyKey(dataParent);
            if (!surveyCard) continue;

            if (priceStrong && priceMap[dataParent] !== undefined) {
                const formatted =
                    "$" +
                    priceMap[dataParent].toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                    });
                priceStrong.textContent = formatted;
                //console.log(`[promoSync] index=${i} | ${dataParent} update price â†’ ${formatted}`);
            }

            el.setAttribute("data-item4build", dataParent);
            if (cb) cb.value = dataParent;

            if (!el.querySelector(".form-deals-list")) {
                el.insertAdjacentHTML("beforeend", DEAL_TAG_HTML);
            }

            if (li) {
                li.setAttribute("data-toggle", "popover");
                li.setAttribute("data-content", `<span class='form-option-item-realtime-price-tips'>${surveyCard.promoText}</span>`);
                li.setAttribute("data-placement", "top");
                li.setAttribute("data-trigger", "hover");
                li.setAttribute("data-html", "true");
                if (typeof jQuery !== "undefined") {
                    jQuery(li).popover({
                        template: '<div class="popover price-tips-popover" role="tooltip"><div class="arrow"></div><h3 class="popover-header"></h3><div class="popover-body"></div></div>',
                    });

                    function itemNumber2NeweggItemNumber(itemNumber) {
                        // internal constants (kept here so the function is self-contained)
                        const USB_ITEM_NUMBER_PREFIX_COMDE = "9B";
                        const ITEMNUMBER_COM = "COM";
                        const ITEMNUMBER_NOTE = "NOTE";
                        const SELLER_ITEM_NUMBER_COMDE = "9SI";
                        const AUTOPART_ITEM_NUMBER_COMDE = "9AT";
                        const rParentItemNumber = /[0-8][0-9A-Z]{2}[-][0-9A-Z]{4}[-][0-9A-Z]{4}[0-9]/;
                        const BOOK_ITEM_NUMBER_REGEX = /978[0-9]{10}/;
                        const NEWEGG_ITEM_NUMBER_PREFIX = "N82E168";
                        const USED_ITEM_NUMBER_PREFIX = "9U";

                        if (!itemNumber || typeof itemNumber !== "string") {
                            return itemNumber;
                        }

                        if (itemNumber.toUpperCase().startsWith(USB_ITEM_NUMBER_PREFIX_COMDE)) {
                            let prefix = itemNumber.substring(0, 2);
                            let suffix = itemNumber.substring(2);
                            return `${prefix}-${suffix}`;
                        }

                        const itemNumberUpperCase = itemNumber.toUpperCase();

                        // special item
                        if (itemNumberUpperCase === ITEMNUMBER_COM || itemNumberUpperCase === ITEMNUMBER_NOTE || itemNumberUpperCase.startsWith(SELLER_ITEM_NUMBER_COMDE) || itemNumberUpperCase.startsWith(AUTOPART_ITEM_NUMBER_COMDE)) {
                            return itemNumber;
                        }

                        // parent item
                        if (rParentItemNumber.test(itemNumberUpperCase)) {
                            return itemNumber;
                        }

                        // used item
                        if (itemNumberUpperCase.startsWith(USED_ITEM_NUMBER_PREFIX)) {
                            return itemNumber;
                        }
                        //book item
                        if (BOOK_ITEM_NUMBER_REGEX.test(itemNumberUpperCase)) {
                            return itemNumber;
                        }
                        // NegeggItemNumber
                        if (itemNumberUpperCase.startsWith(NEWEGG_ITEM_NUMBER_PREFIX)) {
                            return itemNumber;
                        }

                        return NEWEGG_ITEM_NUMBER_PREFIX + itemNumberUpperCase.replace(/-/g, "");
                    }

                    function buildParams(itemNumber) {
                        var urlParams = [];
                        urlParams.push("Item=" + itemNumber2NeweggItemNumber(itemNumber));
                        urlParams.push("cm_sp=product-_-from-price-options-_-survey");
                        return "?" + urlParams.join("&");
                    }

                    jQuery(li).click(function () {
                        var $this = jQuery(this).children("div.form-option-item-realtime-price");
                        jQuery(".form-option-item").removeClass("is-selected");
                        $this.addClass("is-selected");
                        var itemNumber = $this.attr("data-item4build");
                        var paramStr = buildParams(itemNumber);
                        location.href = location.origin + "/" + ($this.attr("data-urlkeywords") != "" ? $this.attr("data-urlkeywords") + "/" : "") + "p/" + itemNumber2NeweggItemNumber(itemNumber) + paramStr;
                    });
                }
            }

            //console.log(`[promoSync] index=${i} | ${dataItem4build} â†’ ${dataParent} | DEAL tag + popover added`);
        }
    }

    var itemList = [];
    switch (__pageInfo__.routeName) {
        case "Product":
        case "ProductWithoutKeyword":
            if (getPCodeBySurvey.itemWhiteList.includes(__initialState__.ItemDetail.Item)) {
                itemList.push(__initialState__.ItemDetail.Item);
            }
            if (__initialState__.ItemDetail.Subcategory?.SubcategoryId === 48) {
                (function waitAndFixVGAOptions(wl) {
                    if (document.querySelector(".form-option-item[data-parent]")) {
                        fixVGAOptions(wl);
                        return;
                    }
                    var obs = new MutationObserver(function (_, o) {
                        if (document.querySelector(".form-option-item[data-parent]")) {
                            o.disconnect();
                            fixVGAOptions(wl);
                        }
                    });
                    obs.observe(document.body, { childList: true, subtree: true });
                    setTimeout(function () {
                        obs.disconnect();
                    }, 60000);
                })(getPCodeBySurvey.itemWhiteList);
            }
            break;
        case "ProductList":
            itemList = getPCodeBySurvey.getPromotionItem(__initialState__.Products);
            break;
        case "EventSaleStore":
            itemList = getPCodeBySurvey.getPromotionItem(__initialState__.ProductDeals);
            break;
        case "DIYItemList":
            itemList = getPCodeBySurvey.getDiyItem(__initialState__.AdaptationItems.Items);
            break;
        case "ComboDetail":
            if (getPCodeBySurvey.itemWhiteList.includes(__initialState__.ComboDetail.ComboID)) {
                itemList.push(__initialState__.ComboDetail.ComboID);
            }
    }
    if (itemList.length > 0) {
        getPCodeBySurvey.handlePromoInsertion(__pageInfo__.routeName, itemList);
    }

    if (__pageInfo__.routeName === "EventSaleStore") {
        if (__initialState__.StaticTemplateId === 2) {
            var target = document.getElementById("Product_List");
            var observer = new MutationObserver(function (mutations, obs) {
                var addedNodesItems = mutations.map(function (mutation) {
                    return $(mutation.addedNodes[0]).children(".goods-container").attr("data-itemnumber");
                });
                if (addedNodesItems.length > 0) {
                    getPCodeBySurvey.handlePromoInsertion(
                        __pageInfo__.routeName,
                        addedNodesItems.filter((e) => getPCodeBySurvey.itemWhiteList.includes(e)).map((e) => e),
                    );
                }
            });
            observer.observe(target, { childList: true });
        }

        jQuery("#Product_List").on("click", ".show-similar", function (params) {
            var itemNumber = $(this).parent().attr("data-itemnumber");
            var groupId = [].concat(__initialState__.ProductDeals, __initialState__.extraDeals || []).find((item) => item?.ProductNumber == itemNumber)?.GroupItemCell?.GroupID;
            if (!itemNumber || !groupId) return;
            if (!$(this).parent().parent().hasClass("show-similar-goods")) {
                getPCodeBySurvey.handleMutationObserver($("#Product_List")[0], (mutation) => {
                    var GroupItemListId = `#GroupItems_${groupId}_${itemNumber}`;
                    if ($(mutation.addedNodes).filter(GroupItemListId).length > 0) {
                        if (Array.isArray(window?.groupItemData?.[groupId]) && window?.groupItemData?.[groupId]?.length > 0) {
                            getPCodeBySurvey.handlePromoInsertion(__pageInfo__.routeName, getPCodeBySurvey.getPromotionItem(window?.groupItemData?.[groupId]));
                        } else {
                            getPCodeBySurvey.handleMutationObserver($(GroupItemListId)[0], (mutation) => {
                                if ($(mutation.addedNodes).filter(".swiper-container")?.length > 0) {
                                    if (Array.isArray(window?.groupItemData?.[groupId]) && window?.groupItemData?.[groupId]?.length > 0) {
                                        getPCodeBySurvey.handlePromoInsertion(__pageInfo__.routeName, getPCodeBySurvey.getPromotionItem(window?.groupItemData?.[groupId]));
                                    }
                                }
                            });
                        }
                    }
                });
            }
        });
    } else if (__pageInfo__.routeName === "DIYItemList") {
        getPCodeBySurvey.handlePromoInsertion(__pageInfo__.routeName, getPCodeBySurvey.getDiyItem(__initialState__.defaultData.Items), {
            container: ".item-container:has(img[src*='{item}']) .item-title",
            selector: ".item-container:has(img[src*='{item}']) .item-promo",
            promoHtml: '<p class="item-promo">{surveyHTML}</p>',
        });

        if (__initialState__.redirectId == 48) {
            function onDIYSAVEWISHLISTResponse(str) {
                var res = JSON.parse(str);
                if (Array.isArray(res.Result?.Items)) {
                    var itemList = res.Result?.Items?.map((e) => e.ItemNumber).filter((e) => getPCodeBySurvey.itemWhiteList.includes(e));
                    if (itemList.length > 0) {
                        setTimeout(() => {
                            getPCodeBySurvey.handlePromoInsertion(__pageInfo__.routeName, itemList, {
                                container: ".item-container:has(img[src*='{item}']) .item-title",
                                selector: ".item-container:has(img[src*='{item}']) .item-promo",
                                promoHtml: '<p class="item-promo">{surveyHTML}</p>',
                            });
                        }, 500);
                    }
                }
            }
            function DiyListMonitor() {
                if (window.__diylistXhrPatched__) return;
                window.__diylistXhrPatched__ = true;
                var origOpen = XMLHttpRequest.prototype.open;
                var origSend = XMLHttpRequest.prototype.send;
                XMLHttpRequest.prototype.open = function (_method, url) {
                    if (url && url.indexOf("/tools/api/DIYSAVEWISHLIST") !== -1) {
                        this._isDIYSAVEWISHLISTApi = true;
                    }
                    origOpen.apply(this, arguments);
                };
                XMLHttpRequest.prototype.send = function () {
                    if (this._isDIYSAVEWISHLISTApi) {
                        var self = this;
                        self.addEventListener("load", function () {
                            onDIYSAVEWISHLISTResponse(self.responseText);
                            XMLHttpRequest.prototype.open = origOpen;
                            XMLHttpRequest.prototype.send = origSend;
                            window.__diylistXhrPatched__ = false;
                        });
                    }
                    origSend.apply(this, arguments);
                };
            }
            DiyListMonitor();
        }
    }
});
