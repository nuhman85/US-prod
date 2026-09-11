(function () {
    const ng_getCookie = (name) => {
        var nameEQ = name + "=";
        var cookies = document.cookie.split(';');
        for (var i = 0; i < cookies.length; i++) {
            var cookie = cookies[i];
            while (cookie.charAt(0) === ' ') {
                cookie = cookie.substring(1, cookie.length);
            }
            if (cookie.indexOf(nameEQ) === 0) {
                var decodedCookie = decodeURIComponent(cookie.substring(nameEQ.length, cookie.length));
                return decodedCookie;
            }
        }
        return null;
    };

    $(document).ready(function () {
        if (JSON.parse(ng_getCookie("CustomerLogin"))?.CustomerNumber) {

            $('head').append(`<style>.tag.is-new{background:linear-gradient(270deg,#f06c00 0,#bd4b00 100%);color:#fff;padding:0 2px;border-radius:2px;margin:3px 5px}.tag.is-new.tag-s .tag-text{font-size:12px;line-height:11px;transform:scale(0.8);display:inline-block;vertical-align:top;font-weight:bold;font-style:italic;text-transform:uppercase;padding:2px 0}.tag.is-new:after{position:absolute;bottom:-4px;left:50%;margin-left:-4px;display:block;content:"";border-color:transparent;border-top-color:#cc4b00;border-style:solid;border-width:4px 4px 0}.tag.is-new.at-top:after{border-top-color:#da5600;border-width:4px 4px 0;bottom:-3px}.tag.is-new.at-right:after{border-right-color:#b85311;border-top-color:transparent;border-width:4px 4px 4px 0;bottom:50%;left:-3px;margin-left:0;transform:translateY(50%)}.tag.is-new.at-left:after{border-left-color:#ea6e1d;border-top-color:transparent;border-width:4px 0 4px 4px;bottom:50%;left:auto;right:-3px;margin-left:0;transform:translateY(50%)}.tag.is-new.at-bottom:after{border-bottom-color:#d55501;border-top-color:transparent;border-width:0 4px 4px 4px;bottom:auto;top:-3px}</style>`);

            const addCustomHtml = () => {
                const targetElement = $(".header2021-nav.header2021-account .menu-body .menu-list-container .section-title-text:contains('My Account')").closest(".menu-list-cell").find("a.menu-list-link:contains('Track An Order')").parent();
                
                if (targetElement.siblings('li').find('a[href="//secure.newegg.com/orders/offers"]').length === 0) {
                    
                    const appendElement = $(`
                        <li><a class="menu-list-link bg-transparent-lightblue" href="//secure.newegg.com/orders/tradein" title="Trade-in Orders">${"Trade-in Orders "}</a></li>
                        <li><a class="menu-list-link bg-transparent-lightblue" href="//secure.newegg.com/orders/offers" title="Offers">${"Offers "}</a></li>
                    `);
                    
                    appendElement.children("a").each(function () {
                        const href = $(this).attr('href');
                        $(this).click(function (e) {
                            if (href.includes('tradein')) {
                                __ga_push({
                                event: "legacy_click",
                                legacy_element_value: "header-account-my trade-in"
                                });
                            } else if (href.includes('offers')) {
                                __ga_push({
                                event: "legacy_click",
                                legacy_element_value: "header-account-my offers"
                                });
                            }
                        });
                    });
                    targetElement.after(appendElement);
                }
            }

            const observer = new MutationObserver(function (mutationsList) {
                mutationsList.forEach(function (mutation) {
                    if (mutation.type === 'attributes' && $(mutation.target).hasClass('is-active')) {
                        addCustomHtml();
                    }
                    if (mutation.type === 'childList') {
                        addCustomHtml();
                    }
                });
            });
            const targetElement = $('.header2021-nav.header2021-account.menu.at-bottom')[0];
            if(!!targetElement){
                observer.observe(targetElement, { attributes: true, childList: true, subtree: true });
            }
        }
    });
}());
