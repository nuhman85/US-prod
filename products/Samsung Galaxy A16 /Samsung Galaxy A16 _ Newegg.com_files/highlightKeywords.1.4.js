(function () {
    /*
        highlight color: <style>#trendingBanner_755812{color:#c63527;} .dark-mode #trendingBanner_755812{color:#FFD700;}</style>
        Requirement: top trending keyword: Clearance, M-Th in red; top trending keyword: Deal Drops, F-Sun red; top trending keyword: Clearance, F-Sun default color
    */
    function KeywordsHighlight(props) { }
    KeywordsHighlight.prototype = {
        constructor: KeywordsHighlight,
        config: {
            highlightBanners: [787429],
            highlightColor: '#{bannerid}{color:#c63527;} .dark-mode #{bannerid}{color:#FFD700;}',
            weekdayHighlight: 'Clearance-disable',
            weekendHighlight: 'Deal Drops-disable'
        },
        formateCSS: function (v) {
            return this.config.highlightColor.replaceAll('{bannerid}', v);
        },
        highlightThisNode: function () {
            var highlightNode = undefined,
                highlightCSS = '',
                that = this,
                colorh = that.config.highlightColor,
                reg = new RegExp(that.config.weekendHighlight, 'i');
            //highlight by banner id
            that.config.highlightBanners.forEach(function (v, i, arr) {
                if (jQuery("#trendingBanner_" + v).length == 1) {
                    highlightCSS = highlightCSS + ' ' + that.formateCSS("trendingBanner_" + v);
                }
            });
            //not found by banner id
            if (!highlightCSS) {
                //if 'deal drops' found then highlight it
                highlightNode = jQuery('#Portals_swiper [id^="trendingBanner"]').filter(function () {
                    return reg.test(jQuery(this).text());
                }).first();
                //if no 'deal drops', then find 'clearance'
                if (highlightNode.length == 0) {
                    highlightNode = jQuery('#Portals_swiper [id^="trendingBanner"]').filter(function () {
                        reg = new RegExp(that.config.weekdayHighlight, 'i');
                        return reg.test(jQuery(this).text());
                    }).first();
                }
                if (highlightNode.length > 0) {
                    highlightCSS = that.formateCSS(highlightNode.attr('id'));
                }
            }
            //add CSS to page
            if (highlightCSS) {
                jQuery('head').append('<style>' + highlightCSS + '</style>');
            }
        }
    }
    try {
        new KeywordsHighlight({}).highlightThisNode();
    } catch (e) { }
})()