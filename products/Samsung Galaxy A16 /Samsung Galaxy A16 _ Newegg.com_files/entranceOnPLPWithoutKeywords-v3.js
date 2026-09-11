(function () {
    //build link 
    function PLPWithoutKeywords(props) {}
    PLPWithoutKeywords.prototype = {
        constructor: PLPWithoutKeywords,
        isNavPLP:function(){
            if(!/ProductList/i.test(utag_data.page_name)){
                return false;
            }
            if(/(\?|&)d=/i.test(location.href)){
                return false;
            }
            if(!/(\?|&)N=/i.test(location.href)){
                return false;
            }
            return true;
        },
        getURLKeywords: function (keywords) {
            return keywords.replace(/[\W]/g, ' ').replace(/\s+/g, '-');
        },
        getSubcategroyInfo: function () {
            var breadcrumb = window.__initialState__.Breadcrumbs,
                subcategroyName,
                subcategoryId,
                tid,
                nValue,
                subcategory;
            if (breadcrumb) {
                breadcrumb = breadcrumb.filter(function (e) {
                    return e.StoreType == 2 ;
                });
                if (breadcrumb && breadcrumb.length > 0) {
                    subcategroyName = breadcrumb[0].Name;
                    subcategoryId = breadcrumb[0].StoreId;
                    tid = breadcrumb[0].Tid;
                    nValue = breadcrumb[0].NValue;
                    subcategory = {
                        name: subcategroyName,
                        urlKeywords: this.getURLKeywords(subcategroyName),
                        id: subcategoryId,
                        tid: tid,
                        nValue: nValue
                    }
                }
            }
            return subcategory;
        },
        insertStyle:function(){
            jQuery('.nav-x-body-top-bar-wrap').prepend('<style type="text/css">@media (max-width: 1500px) {.nav-x-body-top-bar .nav-x .nav-x-cell:nth-child(3){display: none;}}.nav-x .nav-x-title {position: relative;z-index: 21;display: block;padding: 0 10px;color: #1946B8;height: 36px;line-height: 36px;}.nav-x .nav-x-title > strong {color: #222222;}.nav-x a:not(.item-title) { color: #1946B8; font-weight: 700;}.nav-x a:hover,.nav-x-cell:hover a.nav-x-title {text-decoration: underline;}.nav-x-cell:hover a.nav-x-title,.nav-x-cell.is-active .nav-x-title,.nav-x-cell.nav-x-is-active .nav-x-title {border: 0;color: #1946B8;}</style>');
        },
        insertLink: function (prop) {
            var seeMoreHtml = '<div class="nav-x-cell"><a target="_blank" href="' + prop.url + '" title="' + prop.title + '" class="nav-x-title">' + prop.title +  '</a></div>';
            // exist
            if (jQuery('.nav-x-body-top-bar.fix .nav-x').length > 0) {
                jQuery('.nav-x-body-top-bar.fix .nav-x').append(seeMoreHtml);
            } else if (jQuery('.nav-x-body-top-bar.fix').length > 0) {
                jQuery('.nav-x-body-top-bar.fix').last().append('<nav class="nav-x" style="display:inline-block;">' + seeMoreHtml + '</nav>');
            }
        },
        //get event store URL
        render: function () {
            //PLP without keywords. should be navigation PLP
            if(!this.isNavPLP()){
                return;
            }
            var that = this,
                subcategory = that.getSubcategroyInfo(),
                currentURL0,currentURL1,currentURL2,currentURL3,
                currentLink0,currentLink1,currentLink2,currentLink3;
            if (!subcategory) {
                return;
            }
            //insert css
            that.insertStyle();
            //insert best seller 
            currentLink2 = {
                id: 'bestSeller',
                cm_sp: '?cm_sp=best-seller-_-from-plp-nav',
                URL: 'https://www.newegg.com/d/Best-Sellers/{urlKeywords}/s/ID-{subcategoryId}',
                title: 'Best Sellers In ' + subcategory.name
            };
            currentURL2 = currentLink2.URL
                .replace('{urlKeywords}', subcategory.urlKeywords)
                .replace('{subcategoryId}', subcategory.id);
            that.insertLink({
                title: currentLink2.title,
                url: currentURL2 +currentLink2.cm_sp
            });
            //insert clearance store 
            /*currentLink3 = {
                id: 'clearancestore',
                cm_sp: '&cm_sp=clearance-store-_-from-plp-nav',
                URL: 'https://www.newegg.com/Clearance-Store/EventSaleStore/ID-697?N={nValue}',
                title: 'Clearance ' + subcategory.name
            };
            currentURL3 = currentLink3.URL.replace('{nValue}', subcategory.nValue);
            jQuery.get(currentURL3, function (data) {
                if (jQuery(data).find('#Product_List .goods-container').length >0) {
                    that.insertLink({
                        title: currentLink3.title,
                        url: currentURL3 + currentLink3.cm_sp
                    });
                }
            })*/
            //insert check more deals of
            currentLink0 = {
                id: 'directBrand',
                cm_sp: '&cm_sp=plp_nav_promo_store-_-direct_from_manufacturer',
                URL: 'https://www.newegg.com/Homepage-All-Deals/EventSaleStore/ID-9447?N={nValue}',
                title: 'More Deals In ' + subcategory.name
            };
            currentURL0 = currentLink0.URL
                .replace('{nValue}', subcategory.nValue);
            jQuery.get(currentURL0, function (data) {
                if (jQuery(data).find('#Product_List .goods-container').length >0) {
                    that.insertLink({
                        title: currentLink0.title,
                        url: currentURL0 + currentLink0.cm_sp
                    });
                }
            })
            //insert lowest price
            currentLink1 = {
                id: 'LowestPrice',
                cm_sp: '?cm_sp=l30d-_-from-plp-nav',
                URL: 'https://www.newegg.com/d/Lowest-Price-In-30-Days/{urlKeywords}/s/ID-{subcategoryId}',
                title: 'Lowest Price In ' + subcategory.name
            };
            currentURL1 = currentLink1.URL
                .replace('{urlKeywords}', subcategory.urlKeywords)
                .replace('{subcategoryId}', subcategory.id);
            jQuery.get(currentURL1, function (data) {
                if (!/We’re Sorry, there are no items that match your selections. Please adjust your selections to try again/i.test(data)) {
                    that.insertLink({
                        title: currentLink1.title,
                        url: currentURL1 + currentLink1.cm_sp
                    });
                }
            })
        }
    };
    //run 
    try {
        new PLPWithoutKeywords().render();
    } catch (e) {
        //console.error(e);
    }
})()