jQuery(document).ready(function () {
    var isComputerCaseSubcategory = function() {
        var ccTop = (__initialState__ && __initialState__.TopSubCategory && __initialState__.TopSubCategory.StoreType == 2 && __initialState__.TopSubCategory.StoreId == 7);
        var ccBreadCrumb = false;
        if (__initialState__ && __initialState__.Breadcrumbs) {
            for (var i = 0, len = __initialState__.Breadcrumbs.length; i < len; ++i) {
                var item = __initialState__.Breadcrumbs[i];
                if (item && item.StoreType == 2 && item.StoreId == 7) {
                    ccBreadCrumb = true;
                }
            }
        }
        return ccTop || ccBreadCrumb;
    };
    var updateShopByType = function() {
        var isComputerCase = isComputerCaseSubcategory();
        if (!isComputerCase) {
            return;
        }
        var shopType = (jQuery('div.row-body-inner div.list-wrap ul.visual-navs').length > 0);
        if (!shopType) {
            return;
        }
        shopType = (jQuery('div.row-body-inner div.list-wrap ul.visual-navs').parent('.swiper-box').length > 0);
        if (!shopType) {
            return;
        }
        shopType = (jQuery('div.row-body-inner div.list-wrap ul.visual-navs').parent('.swiper-box').find('.swiper-box-top').length > 0);
        if (!shopType) {
            return;
        }
        shopType = (jQuery('div.row-body-inner div.list-wrap ul.visual-navs').parent('.swiper-box').find('.swiper-box-top').text().trim().toUpperCase() === 'SHOP BY TYPE');
        if (!shopType) {
            return;
        }
        var html = [];
        html.push("<li><a href='https://" + window.location.host + "/p/pl?N=100007583%20600546033' title='ATX Full Tower'><div class='item-title'>ATX Full Tower</div></a></li>");
        html.push("<li><a href='https://" + window.location.host + "/p/pl?N=100007583%20600545969' title='ATX Full Tower'><div class='item-title'>ATX Mid Tower</div></a></li>");
        html.push("<li><a href='https://" + window.location.host + "/p/pl?N=100007583%20600546036' title='ATX Full Tower'><div class='item-title'>Micro ATX</div></a></li>");
        html.push("<li><a href='https://" + window.location.host + "/p/pl?N=100007583%20600545970' title='ATX Full Tower'><div class='item-title'>Mini-ITX</div></a></li>");
        html.push("<li><a href='https://" + window.location.host + "/p/pl?N=100007583%20601292092' title='ATX Full Tower'><div class='item-title'>E-ATX Tower Case</div></a></li>");
        jQuery('div.row-body-inner div.list-wrap ul.visual-navs').html(html.join(''));
    };
    var adjustLeftNavigation = function() {
        var isComputerCase = isComputerCaseSubcategory();
        if (!isComputerCase) {
            return;
        }
        if (jQuery('div.row-side div.left-nav dl.filter-box.has-menu').not('.is-category').length <= 0) {
            return;
        }
        var brandItem = null,
            priceItem = null,
            ratingItem = null,
            discountItem = null;
        for (var i = 0, len = jQuery('div.row-side div.left-nav dl.filter-box.has-menu').not('.is-category').length; i < len; ++i) {
            var filterItem = jQuery(jQuery('div.row-side div.left-nav dl.filter-box.has-menu').not('.is-category').get(i));
            var title = filterItem.find('dt.filter-box-title').text().trim().toUpperCase();
            if (title === 'MANUFACTURER') {
                filterItem.find('dt.filter-box-title').text('Featured Brands');
                brandItem = filterItem;
            } else if (title === 'DISCOUNT') {
                discountItem = filterItem;
            } else if (title === 'PRICE') {
                priceItem = filterItem;
            } else if (title === 'CUSTOMER RATINGS') {
                ratingItem = filterItem;
            }
        }
        if (discountItem != null) {
            if (jQuery('div.row-side div.left-nav dl.filter-box.has-menu').not('.is-category').first().find('dt.filter-box-title').text().trim().toUpperCase() != 'DISCOUNT') {
                discountItem.insertBefore(jQuery('div.row-side div.left-nav dl.filter-box.has-menu').not('.is-category').first());
                if (!discountItem.hasClass('is-active')) {
                    discountItem.addClass('is-active');
                    discountItem.find('dt.filter-box-title').click();
                }
            }
        }
        if (priceItem != null) {
            if (jQuery('div.row-side div.left-nav dl.filter-box.has-menu').not('.is-category').first().find('dt.filter-box-title').text().trim().toUpperCase() != 'PRICE') {
                priceItem.insertBefore(jQuery('div.row-side div.left-nav dl.filter-box.has-menu').not('.is-category').first());
                if (!priceItem.hasClass('is-active')) {
                    priceItem.addClass('is-active');
                    priceItem.find('dt.filter-box-title').click();
                }
            }
        }
        if (brandItem != null) {
            if (!['MANUFACTURER', 'FEATURED BRANDS'].includes(jQuery('div.row-side div.left-nav dl.filter-box.has-menu').not('.is-category').first().find('dt.filter-box-title').text().trim().toUpperCase())) {
                brandItem.insertBefore(jQuery('div.row-side div.left-nav dl.filter-box.has-menu').not('.is-category').first());
                if (!brandItem.hasClass('is-active')) {
                    brandItem.addClass('is-active');
                    brandItem.find('dt.filter-box-title').click();
                }
            }
        }
        if (ratingItem != null) {
            if (jQuery('div.row-side div.left-nav dl.filter-box.has-menu').not('.is-category').first().find('dt.filter-box-title').text().trim().toUpperCase() != 'CUSTOMER RATINGS') {
                ratingItem.insertBefore(jQuery('div.row-side div.left-nav dl.filter-box.has-menu').not('.is-category').first());
                if (!ratingItem.hasClass('is-active')) {
                    ratingItem.addClass('is-active');
                    ratingItem.find('dt.filter-box-title').click();
                }
            }
        }
    };
    updateShopByType();
    adjustLeftNavigation();

    var isGamingDesktopsSubcategory = function() {
        var ccTop = (__initialState__ && __initialState__.TopSubCategory && __initialState__.TopSubCategory.StoreType == 2 && __initialState__.TopSubCategory.StoreId == 7);
        var ccBreadCrumb = false;
        if (__initialState__ && __initialState__.Breadcrumbs) {
            for (var i = 0, len = __initialState__.Breadcrumbs.length; i < len; ++i) {
                var item = __initialState__.Breadcrumbs[i];
                if (item && item.StoreType == 2 && item.StoreId == 3742) {
                    ccBreadCrumb = true;
                }
            }
        }
        return ccTop || ccBreadCrumb;
    };

    var adjustGamingDesktopsLeftNavigation = function() {
        var isGamingDesktop = isGamingDesktopsSubcategory();
        if (!isGamingDesktop) {
            return;
        }
        if (jQuery('div.row-side div.left-nav dl.filter-box.has-menu').not('.is-category').length <= 0) {
            return;
        }
        var brandItem = null,
            priceItem = null,
            ratingItem = null,
            firstItem = null,
            firstTitle = null;
        for (var i = 0, len = jQuery('div.row-side div.left-nav dl.filter-box.has-menu').not('.is-category').length; i < len; ++i) {
            var filterItem = jQuery(jQuery('div.row-side div.left-nav dl.filter-box.has-menu').not('.is-category').get(i));
            var title = filterItem.find('dt.filter-box-title').text().trim().toUpperCase();
            if (title === 'MANUFACTURER') {
                brandItem = filterItem;
            } else if (title === 'PRICE') {
                priceItem = filterItem;
            } else if (title === 'CUSTOMER RATINGS') {
                ratingItem = filterItem;
            } else if(firstItem == null){
                firstItem = filterItem;
                firstTitle = title;
            }
        }

        if (ratingItem != null) {
            if (jQuery('div.row-side div.left-nav dl.filter-box.has-menu').not('.is-category').first().find('dt.filter-box-title').text().trim().toUpperCase() != 'CUSTOMER RATINGS') {
                ratingItem.insertBefore(jQuery('div.row-side div.left-nav dl.filter-box.has-menu').not('.is-category').first());
                if (!ratingItem.hasClass('is-active')) {
                    ratingItem.addClass('is-active');
                    ratingItem.find('dt.filter-box-title').click();
                }
            }
        }
        
        if (priceItem != null) {
            if (jQuery('div.row-side div.left-nav dl.filter-box.has-menu').not('.is-category').first().find('dt.filter-box-title').text().trim().toUpperCase() != 'PRICE') {
                priceItem.insertBefore(jQuery('div.row-side div.left-nav dl.filter-box.has-menu').not('.is-category').first());
                if (!priceItem.hasClass('is-active')) {
                    priceItem.addClass('is-active');
                    priceItem.find('dt.filter-box-title').click();
                }
            }
        }
        if (firstItem != null) {
            if (![firstTitle.toUpperCase()].includes(jQuery('div.row-side div.left-nav dl.filter-box.has-menu').not('.is-category').first().find('dt.filter-box-title').text().trim().toUpperCase())) {
                firstItem.insertBefore(jQuery('div.row-side div.left-nav dl.filter-box.has-menu').not('.is-category').first());
                if (!firstItem.hasClass('is-active')) {
                    firstItem.addClass('is-active');
                    firstItem.find('dt.filter-box-title').click();
                }
            }
        }
        if (brandItem != null) {
            if (!['MANUFACTURER'].includes(jQuery('div.row-side div.left-nav dl.filter-box.has-menu').not('.is-category').first().find('dt.filter-box-title').text().trim().toUpperCase())) {
                brandItem.insertBefore(jQuery('div.row-side div.left-nav dl.filter-box.has-menu').not('.is-category').first());
                if (!brandItem.hasClass('is-active')) {
                    brandItem.addClass('is-active');
                    brandItem.find('dt.filter-box-title').click();
                }
            }
        }
    };

    adjustGamingDesktopsLeftNavigation();
});
