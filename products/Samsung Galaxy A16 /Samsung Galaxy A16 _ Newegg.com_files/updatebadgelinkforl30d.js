(function () {
    function updateURL(url) {
        if (!url) {
            return;
        }
        var cm_sp = 'cm_sp=l30d-_-from-badge-' + utag_data.page_name.toLowerCase();
        //check if url already have cm_sp
        if (/(\?|&)cm_sp=/i.test(url)) {
            return url;
        }
        return /\?/i.test(url) ? url + "&" + cm_sp : url + "?" + cm_sp;
    }
    function appendCMSPToURL(jqueryObj) {
        jqueryObj.filter(function () {
                return /\/d\/Lowest-Price-In-30-Days\//i.test(jQuery(this).attr('href'));
            })
            .each(function () {
                jQuery(this).attr('href', updateURL(jQuery(this).attr('href')))
            })
    }
    try {
        if(!/(newproductdetail|productlist|storesubcategory|storebrandsubcategory)/i.test(utag_data.page_name.toLowerCase())){
            return;
        }
        //PDP
        appendCMSPToURL(jQuery('.product-best-price a.flags-body'));
        //PLP, subcat, brand-subcat
        appendCMSPToURL(jQuery('.item-info a.flags-body'));
    } catch (e) {}
})()