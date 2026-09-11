(function () {
  const security = {
      Headers: { NESign: "x-ne-sign", NESignType: "x-ne-sign-type" },
      SIGNATURE_QURIES: ["timestamp", "nonce", "appId", "appSecret"],
      signRequestCore: (query, secret) => {
          const queryParmas = Object.entries(query).filter(([k]) => security.SIGNATURE_QURIES.includes(k));
          queryParmas.sort(([k1], [k2]) => (k1 < k2 ? -1 : k1 > k2 ? 1 : 0));
          queryParmas.push(["appSecret", secret]);
          const queryStr = queryParmas.map(([k, v]) => k + "=" + v).join("&");
          const signature = CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(CryptoJS.MD5(queryStr).toString(CryptoJS.enc.Hex)));
          delete query.appSecret;
          return signature;
      },
      signRequest: (query, appId, appSecret, timediff) => {
          query = Object.assign({}, query ?? {});
          query.timestamp = Math.floor((Date.now() + (timediff ?? 0)) / 1000);
          query.nonce = CryptoJS.lib.WordArray.random(128 / 8).toString(CryptoJS.enc.Hex);
          query.appId = appId;
          return [query, security.signRequestCore(query, appSecret)];
      },
      objectToQueryString: (obj) => {
          const keyValuePairs = [];
          for (const key in obj) {
              if (obj.hasOwnProperty(key)) {
                  keyValuePairs.push(encodeURIComponent(key) + "=" + encodeURIComponent(obj[key]));
              }
          }
          return keyValuePairs.join("&");
      },
      addSignatureParametersMaybe: (targetUrl, callback) => {
          const sign = () => {
              const { var25e70e52, varf418f4a5 } = window?.__SITE__?.var8eec7bc4 || {};
              const url = new URL(targetUrl);
              const queryParamsObject = {};
              const headers = {};
              url?.searchParams?.forEach((value, key) => {
                  queryParamsObject[key] = value;
              });
              const [q, h] = security.signRequest(queryParamsObject, var25e70e52, varf418f4a5, 0);
              headers[security.Headers.NESign] = h;
              headers[security.Headers.NESignType] = "simple";
              url.search = security.objectToQueryString(q);
              callback?.({ url: url?.toString(), headers: headers });
          };
          if (typeof CryptoJS == "object") {
              sign();
          } else {
              jQuery.cachedScript1("https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.0.0/crypto-js.min.js").done(function () {
                  sign();
              });
          }
      },
  };
  const RequestQuoteActionType = {
      NOT_SUPPORTED: 0, // not support Request Quote
      Replace_REQUEST_QUOTE: 1,      // replace OOS to Request Quote
      ADD_REQUEST_QUOTE: 2  // append Request Quote button alongside Add to Cart
  };

  const countryAlpha3 = (__neweggState__?.country?.alpha3 || "").toUpperCase();
  const googleReCAPTCHASetting = __SITE__.productConfig?.googleReCAPTCHASetting;
  const regionSetting = {
      CAN: {
          brandName: "Newegg",
          captchaSiteKey: googleReCAPTCHASetting?.siteKeyCAN,
          privacyPolicyLink: "https://kb.newegg.ca/knowledge-base/privacy-policy",
          serverConfiguratorAbsLink: "https://www.newegg.com/server-system-configurator/ABS",
      },
      USB: {
          brandName: "NeweggBusiness",
          captchaSiteKey: googleReCAPTCHASetting?.siteKeyUSB,
          privacyPolicyLink: "https://kb.neweggbusiness.com/knowledge-base/posting-policy",
          serverConfiguratorAbsLink: "https://www.neweggbusiness.com/server-system-configurator/ABS",
      },
      DEFAULT: {
          brandName: "Newegg",
          captchaSiteKey: googleReCAPTCHASetting?.siteKey,
          privacyPolicyLink: "https://kb.newegg.com/knowledge-base/privacy-policy-newegg",
          serverConfiguratorAbsLink: "https://www.newegg.com/server-system-configurator/ABS",
      },
  };
  const currentRegionSetting = regionSetting?.[countryAlpha3] || regionSetting.DEFAULT;

  const ReCaptcha = {
      widget: null,
      token: "",
      configSiteKey: currentRegionSetting?.captchaSiteKey,
      isReady: function () {
          return typeof window !== "undefined" && typeof window.grecaptcha !== "undefined" && typeof window.grecaptcha.render === "function";
      },
      reset: function () {
          if (ReCaptcha.isReady()) {
              grecaptcha.reset(ReCaptcha.widget);
              ReCaptcha.token = "";
          }
      },
      getResponse: function () {
          let resToken = "";
          if (ReCaptcha.isReady()) {
              resToken = grecaptcha.getResponse(ReCaptcha.widget);
          }
          if (resToken) {
              ReCaptcha.token = resToken;
          }
      },
      init: function (elementId) {
          if (!ReCaptcha.configSiteKey || ReCaptcha.isReady()) return;
          window["onloadCallback"] = function () {
              ReCaptcha.widget = grecaptcha.render(elementId, { sitekey: ReCaptcha.configSiteKey, callback: ReCaptcha.getResponse, "expired-callback": ReCaptcha.reset });
          };
          jQuery.cachedScript1("https://www.google.com/recaptcha/api.js?onload=onloadCallback&render=explicit").done(function () { });
      },
      isVerificationPassed: function () {
          return ReCaptcha.token !== "";
      },
  };
  const requestQuote = {
      PageName: __pageInfo__.routeName,
      EnableQuoteForGuest: __SITE__.UI.RequestQuote.EnableQuoteForGuest,
      SubcategoryidList: __SITE__.UI.RequestQuote.SubcategoryidList,
      Itemfilter: __SITE__.UI.RequestQuote.Itemfilter,
      CountryCode: (__neweggState__?.country?.alpha3 || "").toUpperCase(),
      CountryAlpha2: (__neweggState__?.country?.alpha2 || "US").toUpperCase(),
      WWWDomain: __neweggState__?.domains?.WWW || '',
      SSLDomain: __neweggState__?.domains?.SSL || '',
      EmailConfig: __SITE__.UI.RequestQuote.EmailConfig,
      CurrentItemCell: {},
      CurrentBuildID: null,
      isAbsWorkstation: function (itemCell) {
          return itemCell?.AddToCartType === 0
              && itemCell?.Subcategory?.RealSubCategoryId === 385
              && itemCell?.ItemManufactory?.BrandId === 8484;
      },
      isSubscriptionPurchase: function (itemCell) {
          if (requestQuote.CountryCode !== "USB") return false;
          const sub = itemCell?.Subscription || {};
          if (sub.SubscriptionOnly || sub.IsSubscriptionOnly) return true;
          if (sub.IsSubscription && sub.IsRegularSubscription) {
              return new URLSearchParams(location.search).has("subscribepurchase");
          }
          return false;
      },
      syncUsbPdpSubscriptionQuoteVisibility: function (itemCell) {
          if (requestQuote.CountryCode !== "USB" || !["Product", "ProductWithoutKeyword"].includes(requestQuote.PageName)) return;
          document.body.classList.toggle("usb-pdp-subscription-item", requestQuote.isSubscriptionPurchase(itemCell));
      },
      isAddRequestQuoteAction: function (actionType) {
          return actionType === RequestQuoteActionType.ADD_REQUEST_QUOTE;
      },
      getRequestQuoteButtonSelector: function () {
          return $('a').filter(function () {
              return $(this).find('span').text().trim() === 'Request A quote';
          });
      },
      applyPdpRequestQuoteCallback: function (itemCell) {
            if (!itemCell.CanPreLaunch) {
              if (jQuery(".product-buy-box ul.price li.price-current").length > 0) {
                  jQuery(".product-buy-box ul.price li.price-current").prepend('<span class="item-msg">Starting from </span>');
              } else if (jQuery(".product-buy-box .product-price .price .price-new-action").length > 0) {
                  jQuery(".product-buy-box .product-price .price .price-new-action").before('<li class="price-note" style="font-size:14px"><span class="item-msg">Starting from </span></li>');
              }
          }
          requestQuote.addCustomButton({
              $selector: requestQuote.getRequestQuoteButtonSelector(),
              itemCell: itemCell,
          });
          if (requestQuote.isAbsWorkstation(itemCell)) {
            const $message =
            '<div style="color: rgba(33, 33, 33, 1);font-family: &quot;Open Sans&quot;font-size: 14px;font-weight: 700; text-align: left; margin-top: 15px; line-height: 20px;"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" style="width: 15px;vertical-align: middle;"><path d="M375.8 275.2c-16.4-7-35.4-2.4-46.7 11.4l-33.2 40.6c-46-26.7-84.4-65.1-111.1-111.1L225.3 183c13.8-11.3 18.5-30.3 11.4-46.7l-48-112C181.2 6.7 162.3-3.1 143.6 .9l-112 24C13.2 28.8 0 45.1 0 64c0 0 0 0 0 0C0 295.2 175.2 485.6 400.1 509.5c9.8 1 19.6 1.8 29.6 2.2c0 0 0 0 0 0c0 0 .1 0 .1 0c6.1 .2 12.1 .4 18.2 .4c0 0 0 0 0 0c18.9 0 35.2-13.2 39.1-31.6l24-112c4-18.7-5.8-37.6-23.4-45.1l-112-48zM441.5 464C225.8 460.5 51.5 286.2 48.1 70.5l99.2-21.3 43 100.4L154.4 179c-18.2 14.9-22.9 40.8-11.1 61.2c30.9 53.3 75.3 97.7 128.6 128.6c20.4 11.8 46.3 7.1 61.2-11.1l29.4-35.9 100.4 43L441.5 464zM48 64s0 0 0 0s0 0 0 0s0 0 0 0s0 0 0 0s0 0 0 0s0 0 0 0s0 0 0 0s0 0 0 0s0 0 0 0s0 0 0 0s0 0 0 0s0 0 0 0s0 0 0 0s0 0 0 0s0 0 0 0s0 0 0 0s0 0 0 0s0 0 0 0s0 0 0 0s0 0 0 0s0 0 0 0s0 0 0 0s0 0 0 0z"></path></svg> 888-382-2088 Call for consultation OR to get quote</div>';
            jQuery("#ProductBuy>div.product-buy>div.product-btn-group").before($message);
          }
      },
      applyPlpRequestQuoteCallback: function (itemCell, $itemCell) {
          if (!itemCell.CanPreLaunch) {
              $itemCell.find(".price .price-current").prepend('<span class="item-msg">Starting from </span>');
          }
          requestQuote.addCustomButton({
              $selector: $itemCell.find('a').filter(function () {
                  return $(this).find('span').text().trim() === 'Request A quote';
              }),
              itemCell: itemCell,
          });
      },
      addRequestQuote: function ({ $selector, itemCell, callback, actionType }) {
          $selector?.each(function () {
              const $this = $(this);
              
              // check duplicate button
              if (requestQuote.isAddRequestQuoteAction(actionType)) {
                  // check if there is already a Request A quote button after the button
                  if ($this.next('a[data-toggle="modal"]').length > 0 || $this.next('.btn-mini').length > 0 || $this.next('.add-request-quote').length > 0) {
                      return; // already exists, skip
                  }
              } else {
                  // check if the button is already a Request A quote button
                  if ($this.text().trim() === "Request A quote" || $this.find('span').text().trim() === "Request A quote") {
                      return; // already is a Request A quote button, skip
                  }
              }
              
              let classes = $this?.attr("class");
              if (requestQuote.isAddRequestQuoteAction(actionType)) {    
                  switch(requestQuote.PageName) {
                      case "Product":
                      case "ProductWithoutKeyword":{
                          classes = "btn btn-secondary btn-wide add-request-quote";
                          break;
                      }
                      case "BrandSubCat":
                      case "SubCategory":
                      case "Category":
                      case "ProductList":
                      case "TabStore":{
                          classes = "btn btn-secondary btn-mini";
                          break;
                      }
                      case "EventSaleStore":{
                          classes = "bg-blue button button-s";
                          break;
                      }
                  }
              }
              const useModal = requestQuote.CountryCode !== "USB" || itemCell?.AddToCartType === 4;
              const $requestQuote = $(`<a href="javascript:;" ${useModal ? 'data-toggle="modal"' : ""} class="${classes}"><span>Request A quote</span> <i class="fas fa-caret-right"></i></a>`);
              
              if (requestQuote.isAddRequestQuoteAction(actionType)) {
                  $this.after($requestQuote);
              } else {
                  $this.replaceWith($requestQuote);
              }
              
              $requestQuote.on("click", function () {
                  // add tracking for Request A Quote button click
                  window?.__ga_push({
                      event: "legacy_click",
                      legacy_element_value: "request_quote_button_click",
                      products: itemCell?.Item || "",
                  });
                  
                  if (requestQuote.CountryCode === "USB" && itemCell?.AddToCartType !== 4) {
                      requestQuote.addToQuoteForUSB(itemCell?.Item);
                      return;
                  }
                  
                  if (!requestQuote.redirectToServerBuilder(itemCell?.Item)) {
                      $("#item-title").html(`Item: ${itemCell?.Description?.Title}`);
                      if (itemCell?.ItemManufactory?.BrandId == 10772) {
                          $('label:contains("Organization")').html("Organization (A Valid Business Name is Required to Purchase This Product.)");
                      }
                      requestQuote.showModal(itemCell);
                  }
              });
          });
          callback?.(itemCell);
      },
      addCustomButton: function ({ $selector, itemCell }) {
          // Check if conditions are met
          const validPageNames = ["ProductWithoutKeyword", "Product", "ProductList"];
          if (!validPageNames.includes(requestQuote.PageName)) {
              return;
          }
          if (itemCell?.ItemManufactory?.BrandId !== 8484) {
              return;
          }
          if (itemCell?.Subcategory?.RealSubCategoryId !== 385) {
              return;
          }
          if (!["USA", "USB"].includes(requestQuote.CountryCode)) {
              return;
          }
          
          $selector?.each(function () {
              const $requestQuoteBtn = $(this);
              
              // Check if Custom button already exists
              if ($requestQuoteBtn.next('a[data-custom-button="true"]').length > 0) {
                  return;
              }
              
              // Use the same classes as Request A quote button
              let classes = $requestQuoteBtn.attr("class");
              
              const $customButton = $(`<a href="javascript:;" class="${classes}" data-custom-button="true"><span>Customize</span> <i class="fas fa-caret-right"></i></a>`);
              
              $requestQuoteBtn.after($customButton);
              
              $customButton.on("click", function () {
                  // add tracking for Custom button click
                  window?.__ga_push({
                      event: "legacy_click",
                      legacy_element_value: "request_quote_custom_button_click",
                      products: itemCell?.Item || "",
                  });
                  
                  // Delay navigation to ensure GA tracking is sent
                  setTimeout(function() {
                      window.location.href = currentRegionSetting?.serverConfiguratorAbsLink
                  }, 500);
              });
          });

          if(requestQuote.PageName == "Product" 
              || requestQuote.PageName == "ProductWithoutKeyword") {
              var html = `<div class="tag tag-s tag-danger margin-vertical-5px" style="cursor: pointer;" id="BuildtoOrderTag"><div><div class="tag-text">Build to Order (BTO) - Custom Built After Order </div></div></div>`;
                      document.querySelector('#newProductPageContent div.product-pane > div.product-price').insertAdjacentHTML('beforeend', html);
                      document.querySelector('#BuildtoOrderTag').addEventListener('click', () => {
                          const element = document.querySelector('#product-warranty');
                          if (element) {
                              element.scrollIntoView({
                                  behavior: 'smooth',
                                  block: 'start'
                              });
                          }
                      }
                      );
          }
      },
      requestQuotePopup: function () {
          const popupStyle = `
          .add-request-quote {
              margin-top: 10px;
              font-size: 18px;
          }
          #ProductBuy a[data-custom-button="true"]{
              margin-top: 10px !important;
          }
          @media (max-width: 1399px) { 
              .add-request-quote {
                  font-size: 14px;
              }
          }
        .modal-quickview .modal-content .grid-wrap .item-action .item-operate .item-button-area .btn-secondary {
          padding: 8px 0.5em;
        }
        .modal-quote {
          z-index: 2001;
        }
        .modal-quote .modal-content {
          padding: 15px 30px;
        }
        .modal-quote .modal-title {
          text-transform: uppercase;
          font-style: italic;
          font-weight: 800;
        }
        .modal-quote .modal-header .close {
          margin: -4px -14px 0 0;
        }
        .modal-quote .grid {
          justify-content: space-between;
        }
        .modal-quote .grid-col {
          margin-bottom: 10px;
        }
        .modal-quote .grid-col.col-w-2 {
          max-width: calc(50% - 10px);
        }
        .modal-quote .grid-col.col-w-3 {
          max-width: calc(33.3% - 10px);
        }
        .modal-quote .grid-col input::placeholder {
          font-size: 13px;
        }
        .modal-quote .input-textarea > textarea {
          max-height: 80px;
        }
        .modal-quote .modal-md {
          max-width: 870px;
        }
        .modal-quote .button-group {
          margin: 0 0 10px;
        }
        .modal-quote .button-group .button:last-child {
          margin-left: 20px;
        }
        .modal-quote .link-more {
          text-decoration: underline;
          font-size: 12px;
          font-weight: bold;
        }
        .modal-quote .modal-body.success-status {
          display: none;
        }
        .modal-quote .modal-body.success-status div {
          margin-bottom: 20px;
          text-align: left;
          font-size: 16px;
        }
        .modal-quote .modal-body.failed-status {
          display: none;
        }
        .modal-quote .modal-body.failed-status div {
          margin-bottom: 20px;
          text-align: left;
          font-size: 16px;
        }
        .modal-quote.show-success-staus .modal-body.form{
          display: none;
        }
        .modal-quote.show-success-staus .modal-body.success-status {
          display: block;
        }
        .modal-quote.show-failed-staus .modal-body.form{
          display: none;
        }
        .modal-quote.show-failed-staus .modal-body.failed-status {
          display: block;
        }
        .modal-quote .modal-header {
          flex-wrap: wrap;
          gap: 10px;
          margin-bottom: 10px;
        }
        [id^="recommend_modules_swiper"] .item-container .item-info .price .price-current {
          height: auto;
        }
        [id^="recommend_modules_swiper"] .item-button-area,
        .recommend_modules_swiper_customer .item-button-area,
        .product-recommended-combo .item-button-area,
        .swiper-box.similar_box .item-button-area {
            display: flex;
            flex-wrap: wrap;
            gap: 5px;
        }
        [id^="recommend_modules_swiper"] .add-request-quote.btn,
        .recommend_modules_swiper_customer .add-request-quote.btn,
        .product-recommended-combo .add-request-quote.btn,
        .swiper-box.similar_box .add-request-quote.btn {
            margin-top:0;
            font-size: 12px;
            width:auto;
        }
        @media (max-width: 1399px) {

            [id^="recommend_modules_swiper"] .add-request-quote.btn,
            .recommend_modules_swiper_customer .add-request-quote.btn,
            .product-recommended-combo .add-request-quote.btn,
            .swiper-box.similar_box .add-request-quote.btn {
                font-size: 12px;
            }
        }
        body.usb-pdp-subscription-item .add-request-quote,
        body.usb-pdp-subscription-item a[data-custom-button="true"],
        body.usb-pdp-subscription-item .product-buy-box .item-msg,
        body.usb-pdp-subscription-item #ProductBuy .item-msg {
            display: none !important;
        }
        `;
          const loginInfo = requestQuote.getCustomerInfoFromCookie();
          const fullName = loginInfo?.ContactWith ?? "";
          const firstSpaceIndex = fullName.trim().indexOf(" ");
          const firstName = firstSpaceIndex !== -1 ? fullName.substring(0, firstSpaceIndex).trim() : fullName.trim();
          const lastName = firstSpaceIndex !== -1 ? fullName.substring(firstSpaceIndex + 1).trim() : "";

          const popup_init_html = `
        <div class="modal fade modal-quote" id="modal-quote" tabindex="-1" role="dialog" aria-labelledby="modal-quote" aria-hidden="true">
          <div class="modal-dialog modal-md modal-dialog-centered" role="document">
              <div class="modal-content">
                  <div class="modal-header">
                      <div class="modal-title">submit inquiry</div>
                      <button type="button" class="close" data-dismiss="modal" aria-label="Close" id="modal-quote-close">
                          <span aria-hidden="true"><i class="ico ico-times"></i></span>
                      </button>
                      <p class="text-gray" style="font-size: 14px;font-weight: 700;width:100%"> (888) 382-2088, call for a consultation or to get a quote.</p>
                  </div>
                  <div class="modal-body form">
                      <div class="grid">
                          <div class="grid-col col-w-3">
                              <label htmlFor="inputField_firstName" class="input-label text-gray font-m">First Name</label>
                              <div class="input-text">
                                  <input id="inputField_firstName" value='${firstName}' type="text" aria-label="First Name" required="true" autoComplete="off">
                                  <div class="form-error-msg radius-s font-s at-right">Please enter a valid Frist Name.</div>
                              </div>
                          </div>
                          <div class="grid-col col-w-3">
                               <label htmlFor="inputField_lastName" class="input-label text-gray font-m">Last Name</label>
                              <div class="input-text">
                                  <input id="inputField_lastName" value='${lastName}' type="text" aria-label="Last Name" required="true" autoComplete="off">
                                  <div class="form-error-msg radius-s font-s at-right">Please enter a valid Last Name.</div>
                              </div>
                          </div>
                          <div class="grid-col col-w-3">
                              <label htmlFor="inputField_workEmail" class="input-label text-gray font-m">Work Email</label>
                              <div class="input-text">
                                  <input id="inputField_workEmail" type="email" value='${loginInfo?.LoginName ?? ""}' ${loginInfo?.LoginName ? "disabled" : ""} aria-label="Work Email" required="true" autoComplete="off" data-regex="[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z0-9]{2,}$">
                                  <div class="form-error-msg radius-s font-s at-right">Please enter a valid Work Email.</div>
                              </div>
                          </div>                   
                          <div class="grid-col col-w-2">
                              <label htmlFor="inputField_phone" class="input-label text-gray font-m">Phone</label>
                              <div class="input-text">
                                  <input id="inputField_phone" placeholder="We will call you within one business day from (888) 382-2088." type="tel" aria-label="Phone" required="true" autoComplete="off" data-regex="^(\\W*)(01|1){0,1}(\\W*)(\\d{3})(\\W*)(\\d{3})(\\W*)(\\d{4})$">
                                  <div class="form-error-msg radius-s font-s at-right">Please enter a valid Phone.</div>
                              </div>
                          </div>
                          <div class="grid-col col-w-2">
                              <label htmlFor="inputField_organization" class="input-label text-gray font-m">Organization</label>
                              <div class="input-text">
                                  <input id="inputField_organization" type="text" aria-label="Organization" required="true" autoComplete="off">
                                  <div class="form-error-msg radius-s font-s at-right">Please enter a valid Organization.</div>
                              </div>
                          </div>

                          <div class="grid-col col-w-2">
                              <label htmlFor="inputField_address1" class="input-label text-gray font-m">Primary Address</label>
                              <div class="input-text">
                                  <input id="inputField_address1" type="text" aria-label="Address1" required="true" autoComplete="off" placeholder="Start typing your address to search">
                                  <div class="form-error-msg radius-s font-s at-right">Please enter a valid Primary Address.</div>
                              </div>
                          </div>
                          <div class="grid-col col-w-2">
                              <label htmlFor="inputField_address2" class="input-label text-gray font-m">Secondary Address</label>
                              <div class="input-text">
                                  <input id="inputField_address2" type="text" aria-label="Address2" autoComplete="off" placeholder="Apartment, suite, unit, building, floor, etc.">
                              </div>
                          </div>
                          <div id="quoteAddresssearch" style="position: relative;width: 500px;top: -7px;"></div>
                          <div class="grid-col col-w-2">
                              <label htmlFor="inputField_city" class="input-label text-gray font-m">City</label>
                              <div class="input-text">
                                  <input id="inputField_city" type="text" aria-label="City" required="true" autoComplete="off" />
                                  <div class="form-error-msg radius-s font-s at-right">Please enter a valid City.</div>
                              </div>
                          </div>
                          <div class="grid-col col-w-2">
                              <label htmlFor="inputField_state" class="input-label text-gray font-m">State</label>
                              <div class="input-text">
                                  <input id="inputField_state" type="text" aria-label="State" required="true" autoComplete="off" />
                                  <div class="form-error-msg radius-s font-s at-right">Please enter a valid State.</div>
                              </div>
                          </div>
                          <div class="grid-col col-w-2">
                              <label htmlFor="inputField_zipcode" class="input-label text-gray font-m">ZipCode</label>
                              <div class="input-text">
                                  <input id="inputField_zipcode" type="text" aria-label="ZipCode" required="true" autoComplete="off" />
                                  <div class="form-error-msg radius-s font-s at-right">Please enter a valid ZipCode.</div>
                              </div>
                          </div>
                          <div class="grid-col col-w-2">
                              <label htmlFor="inputField_quantity" class="input-label text-gray font-m">Quantity</label>
                              <div class="input-text">
                                  <input id="inputField_quantity" type="text" aria-label="Quantity" value="1" maxLength="6" required="true" data-regex="^[1-9]{1}[0-9]*$">
                                  <div class="form-error-msg radius-s font-s at-right">Please enter a valid Quantity.</div>
                              </div>
                          </div>

                          <div class="grid-col">
                              <label htmlFor="inputField_timeFrame" class="input-label text-gray font-m">Projected Time Frame(Optional)</label>
                              <div class="input-text">
                                  <input id="inputField_timeFrame" type="text" aria-label="Projected Time Frame(Optional)" autoComplete="off">
                              </div>
                          </div>
                          <div class="grid-col">
                              <label htmlFor="inputField_question" class="input-label text-gray font-m">Special Requirements(Optional)</label>
                              <div class="input-textarea">
                                  <textarea id="inputField_question" aria-label="Special Requirements(Optional)" autoComplete="off"></textarea>
                              </div>
                          </div>
                          <div class="grid-col">
                              <label class="input-label text-gray font-m" id="item-title">Quantity</label>
                          </div>
                      </div>
                      <div class="button-group display-flex align-items-center">
                          <div id="request-quote-recaptcha" style="flex: 1;"></div>
                          <button type="button" class="button bg-white" id="modal-quote-cancel">Cancel</button>
                          <button type="button" class="button bg-orange" id="modal-quote-submit">SUBMIT</button>
                      </div>
                      <p class="text-gray font-s">By clicking "Submit" above,you consent to allow ${currentRegionSetting?.brandName} to store and process the personal information submitted above to provide you the content requested.Please review our <a href="${currentRegionSetting?.privacyPolicyLink}" class="link-more text-gray">Privacy Policy</a>.for more information.</p>
                  </div>
                  <div class="modal-body success-status">
                    <div>
                      Thank you for choosing ${currentRegionSetting?.brandName} for your inquiry.
                    </div>
                    <div>
                      We are reviewing the specifications and requirements outlined from your
                      inquiry, and we will be in touch shortly.
                    </div>
                  </div>
                  <div class="modal-body failed-status">
                    <div>
                      Submit failed, please try again later.
                    </div>
                  </div>
              </div>
          </div>
        </div>
        <div class='loader has-overlay requestQuote-loading' style='display:none'><i class='fa fa-spinner fa-spin'></i>LOADING...</div>
        <div id='overlay' style='display:none' class='requestQuote-loading'></div>
      `;
          $("head").append(`<style>${popupStyle}</style>`);
          $("body").append(popup_init_html);
          jQuery("#modal-quote").on("click", function (event) {
              if ($(event.target).closest(".modal-content")?.length === 0) {
                  requestQuote.hideModal();
              }
          });
          jQuery("#modal-quote-close").click(function() {
              // add tracking for close button click
              window?.__ga_push({
                  event: "legacy_click",
                  legacy_element_value: "request_quote_form_close_button_click",
                  products: requestQuote?.CurrentItemCell?.Item || "",
              });
              requestQuote.hideModal();
          });
          jQuery("#modal-quote-cancel").click(function() {
              // add tracking for Cancel button click
              window?.__ga_push({
                  event: "legacy_click",
                  legacy_element_value: "request_quote_form_cancel_button_click",
                  products: requestQuote?.CurrentItemCell?.Item || "",
              });
              requestQuote.hideModal();
          });
          $('#modal-quote .modal-body .grid-col [id^="inputField_"]').on("input", requestQuote.checkValidData);
          $("#modal-quote-submit").click(function () {
              // add tracking for Submit button click
              window?.__ga_push({
                  event: "legacy_click",
                  legacy_element_value: "request_quote_form_submit_button_click",
                  products: requestQuote?.CurrentItemCell?.Item || "",
              });
              
              $('#modal-quote .modal-body .grid-col [id^="inputField_"]').each(requestQuote.checkValidData);
              if (!ReCaptcha.isVerificationPassed()) return;
              if ($("#modal-quote .modal-body .grid-col .form-error-msg:visible").length == 0) {
                  const formData = {};
                  $('#modal-quote .modal-body .grid-col [id^="inputField_"]').each(function () {
                      const key = $(this).attr("id").replace("inputField_", "");
                      formData[key] = $(this).val();
                  });
                  const buildID = requestQuote.createBuildID();
                  requestQuote.CurrentBuildID = buildID;

                  let address = [formData['address1'], formData['address2'], formData['city'], formData['state']]
                      .filter(p => p && p.length > 0)
                      .join(', ');
                  if (formData['zipcode'] && formData['zipcode'].length > 0) {
                      address = address + ' ' + formData['zipcode'];
                  }
                  formData['address'] = address || '';

                  const fullName = [formData['firstName'], formData['lastName']]
                      .filter(p => p && p.length > 0)
                      .join(' ');
                  formData['fullName'] = fullName || '';


                  $(".requestQuote-loading").show();
                  let emailArray = [];
                  emailArray.push({ Key: "Customer", Value: requestQuote.formatDataVariables(formData, false) });
                  emailArray.push({ Key: "Insider", Value: requestQuote.formatDataVariables(formData, true) });
                  requestQuote.sendToQuoteRequestAPI(
                      formData,
                      emailArray,
                      (p) => {
                          let res = null;
                          if (p) {
                              res = JSON.parse(p);
                          }
                          if (res?.Success) {
                              // add tracking for form success submit
                              window?.__ga_push({
                                  event: "legacy_click",
                                  legacy_element_value: "request_quote_form_submit_success",
                                  products: requestQuote?.CurrentItemCell?.Item || "",
                              });
                              
                              $(".requestQuote-loading").hide();
                              requestQuote.toggleModal(true);
                              requestQuote.initFormFieldValid();
                              ReCaptcha.reset();
                          } else {
                              // add tracking for form submit failed
                              window?.__ga_push({
                                  event: "legacy_click",
                                  legacy_element_value: "request_quote_form_submit_failed",
                                  products: requestQuote?.CurrentItemCell?.Item || "",
                              });
                              
                              $(".requestQuote-loading").hide();
                              $("#modal-quote .modal-header .modal-title").html("Submit failed!");
                              $("#modal-quote").addClass("show-failed-staus");
                          }
                      },
                      () => {
                          // add tracking for API call failed
                          window?.__ga_push({
                              event: "legacy_click",
                              legacy_element_value: "request_quote_form_api_call_failed",
                              products: requestQuote?.CurrentItemCell?.Item || "",
                          });
                          
                          $(".requestQuote-loading").hide();
                          $("#modal-quote .modal-header .modal-title").html("Submit failed!");
                          $("#modal-quote").addClass("show-failed-staus");
                      }
                  );
              }
          });
      },
      initNSuggestAddress: function () {
          if (window.NSuggestAddress) return;

          jQuery.cachedScript1("https://c1.neweggimages.com/webresource/Scripts/newegg-suggest-address-1.1.6.min.js").done(function () {
              const coyntryCode = requestQuote.CountryCode || 'USA';
              const customerNumber = requestQuote?.getCustomerInfoFromCookie()?.LoginId ?? 0
              const Scene = customerNumber ? "QuoteRequest" : "QuoteRequestGuest";

              window.NSuggestAddress && window.NSuggestAddress.Init({
                  AddressInputElement: document.getElementById("inputField_address1"),
                  ContainerID: 'quoteAddresssearch',
                  CallBack: (addr) => {
                      $('#inputField_address1').val(addr.Address1 || '');
                      $('#inputField_address2').val(addr.Address2 || '');
                      $('#inputField_city').val(addr.City || '');
                      $('#inputField_state').val(addr.State || '');
                      $('#inputField_zipcode').val(addr.ZipCode || '');
                  },
                  Setting: {
                      Timeout: 5000,
                      SearchLength: 2,
                      Scene: Scene,
                      VerifyFrom: 'EGG',
                      Country: coyntryCode,
                      Environment: "Prd",
                      NVTC: window.GA4Util.getNVTC(),
                      CustomerNumber: customerNumber + "",
                  },
                  WithUI: true,
              });
          });
      },
      initFormFieldValid: function () {
          $('#modal-quote .modal-body .grid-col [id^="inputField_"]').each(function () {
              const $this = $(this);
              $(this).parent().removeClass("show-error");
              switch ($this.attr("id").replace("inputField_", "")) {
                  case "quantity": {
                      $this?.val("1");
                      return;
                  }
                  case "workEmail": {
                      $this?.val(requestQuote?.getCustomerInfoFromCookie()?.LoginName ?? "");
                      return;
                  }
                  case "fullName": {
                      $this?.val(requestQuote?.getCustomerInfoFromCookie()?.ContactWith ?? "");
                      return;
                  }
                  default: {
                      $this?.val("");
                      return;
                  }
              }
          });
      },
      redirectToServerBuilder: function (itemNumber) {
          var dic = {
              '59-155-922': 'https://www.newegg.com/server-system-configurator/PowerEdge-R760xs-Rack-Server/59-155-943?version=pe_r760xs_tm_vi_vp_sb',
              '59-155-899': 'https://www.newegg.com/server-system-configurator/PowerEdge-R260-Rack-Server/59-155-953?version=pe_r260_tm_vi_vp_sb',
              '59-155-923': 'https://www.newegg.com/server-system-configurator/PowerEdge-T150-Server/59-155-957',
              '59-155-924': 'https://www.newegg.com/server-system-configurator/PowerEdge-T160-Tower-Server/59-155-958?version=pe_t160_tm_vi_vp_sb',
              '59-155-925': 'https://www.newegg.com/server-system-configurator/PowerEdge-T360-Tower-Server/59-155-959?version=pe_t360_tm_vi_vp_sb',
              '59-155-906': 'https://www.newegg.com/server-system-configurator/PowerEdge-R660xs-Rack-Server/59-155-947?version=pe_r660xs_tm_vi_vp_sb',
              '59-155-905': 'https://www.newegg.com/server-system-configurator/PowerEdge-R660-Rack-Server/59-155-944?version=pe_r660_tm_vi_vp_sb',
              '59-155-908': 'https://www.newegg.com/server-system-configurator/PowerEdge-R760-Rack-Server/59-155-945?version=pe_r760_tm_vi_vp_sb',
              '59-155-907': 'https://www.newegg.com/server-system-configurator/PowerEdge-R6615-Server/59-155-951?version=pe_r6615_tm_vi_vp_sb',
              '59-155-921': 'https://www.newegg.com/server-system-configurator/PowerEdge-R760xd2-Rack-Server/59-155-946?version=amer_r760xd2_16753_vi_vp',
              '59-995-031': 'https://www.newegg.com/server-system-configurator/PowerEdge-R470-Server/59-995-039?version=pe_r470_tm_vi_vp_sb',
              '59-995-035': 'https://www.newegg.com/server-system-configurator/PowerEdge-R6715-Server/59-995-043?version=pe_r6715_tm_vi_vp_sb',
              '59-995-036': 'https://www.newegg.com/server-system-configurator/PowerEdge-R7715-Server/59-995-044?version=pe_r7715_tm_vi_vp_sb',
              '59-155-900': 'https://www.newegg.com/server-system-configurator/PowerEdge-R360-Server/59-155-954?version=pe_r360_tm_vi_vp_sb',
              '59-155-932': 'https://www.newegg.com/server-system-configurator/PowerEdge-R7615-Server/59-155-952?version=pe_r7615_tm_vi_vp_sb',
              '59-995-033': 'https://www.newegg.com/server-system-configurator/PowerEdge-R670-Server/59-995-041?version=pe_r670_tm_vi_vp_sb',
              '59-995-034': 'https://www.newegg.com/server-system-configurator/PowerEdge-R770-Server/59-995-042?version=pe_r770_tm_vi_vp_sb',
              '59-995-037': 'https://www.newegg.com/server-system-configurator/PowerEdge-R6725-Server/59-995-045?version=pe_r6725_tm_vi_vp_sb',
              '59-995-038': 'https://www.newegg.com/server-system-configurator/PowerEdge-R7725-Server/59-995-046?version=pe_r7725_tm_vi_vp_sb',
              '59-155-915': 'https://www.newegg.com/server-system-configurator/PowerEdge-R6625-Server/59-155-948?version=pe_r6625_tm_vi_vp_sb',
              '59-155-929': 'https://www.newegg.com/server-system-configurator/PowerEdge-R7625-Server/59-155-949?version=pe_r7625_tm_vi_vp_sb',
              '59-155-913': 'https://www.newegg.com/server-system-configurator/PowerEdge-R860-Server/59-155-955?version=AMER_R860_16717_VI_VP',
              '59-155-912': 'https://www.newegg.com/server-system-configurator/PowerEdge-R960-Server/59-155-956?version=AMER_R960_16718_VI_VP',
              '59-155-914': 'https://www.newegg.com/server-system-configurator/PowerEdge-T560-Tower-Server/59-155-961?version=pe_t560_tm_vi_vp_sb',
              '59-155-920': 'https://www.newegg.com/server-system-configurator/PowerEdge-R760xa-Rack-Server/59-155-950?version=pe_r760xa_tm_vi_vp',
              '16-145-148':'https://www.newegg.com/server-system-configurator/IBM-FlashSystem-5300/16-145-484',
              '16-145-336':'https://www.newegg.com/server-system-configurator/IBM-FlashSystem-5300/16-145-484',
              '16-145-338':'https://www.newegg.com/server-system-configurator/IBM-FlashSystem-5300/16-145-484',
              '16-145-340':'https://www.newegg.com/server-system-configurator/IBM-FlashSystem-5300/16-145-484',
              '16-145-396':'https://www.newegg.com/server-system-configurator/IBM-FlashSystem-5300/16-145-484',
              '16-145-397':'https://www.newegg.com/server-system-configurator/IBM-FlashSystem-5300/16-145-484',
              '16-145-398':'https://www.newegg.com/server-system-configurator/IBM-FlashSystem-5300/16-145-484',
              '16-145-403':'https://www.newegg.com/server-system-configurator/IBM-FlashSystem-5300/16-145-484',
          };
          if (dic[itemNumber]) {
              window.open(dic[itemNumber], "_blank");
              return true;
          }
          return false;
      },
      addToQuoteForUSB: function (itemNumber) {
          const qtyBox = document.querySelector('#ProductBuy .qty-box');
          const qty = qtyBox?.querySelector('input')?.value || 1;
          $(".requestQuote-loading").show();
          $.ajax({
              method: "GET",
              url: `https://${requestQuote.SSLDomain}/ajaxquote/addtoquote?submit=ADD&ItemList=${itemNumber}|${qty}&EWTList=`,
              cache: false,
              crossDomain: true,
              data: {
                  "X-Requested-With": "XMLHttpRequest",
              },
              xhrFields: {
                  withCredentials: true,
              },
          }).done(function (response) {
              if (response.success || response.Success) {
                  window.location = `https://${requestQuote.WWWDomain}/shopping/shoppingitem.aspx?Item=${itemNumber}&Qty=${qty}&ItemList=${itemNumber}|${qty}&EWTList=&quoteMode=true&errorCode=`;
              } else {
                  const nextPage = response.nextpage || response.NextPage;
                  window.location = (response.failedmessage || response.FailedMessage) ? nextPage : (window.Web?.Config?.Environment?.Url?.ErrorPage || nextPage);
              }
          }).fail(function () {
              $(".requestQuote-loading").hide();
          });
      },
      checkValidData: function () {
          const val = $(this)?.val()?.trim();
          const regex = new RegExp($(this).data("regex"));
          const isRequired = $(this).prop("required");
          if ((regex && !regex.test(val)) || (isRequired && !val)) {
              $(this).parent().addClass("show-error");
          } else {
              $(this).parent().removeClass("show-error");
          }
      },
      sendEmail: function (sendEmailParams, successCallback, errorCallback) {
          security.addSignatureParametersMaybe(window.location.origin + "/api/Pigeon", ({ url, headers }) => {
              $.ajax({
                  type: "POST",
                  url,
                  headers,
                  contentType: "application/json",
                  dataType: "json",
                  data: JSON.stringify(sendEmailParams),
                  success: function (res) {
                      successCallback?.(res);
                  },
                  error: function (error) {
                      console.error(error);
                      errorCallback?.(error);
                  },
              });
          });
      },
      htmlEncode: function (input) {
          if (!input) return input;
          var el = document.createElement("div");
          el.innerText = input;
          return el.innerHTML;
      },
      formatDataVariables: function (formData, isInternal) {
          const dataVariables = {
              ...(isInternal && {
                  CustomerName: requestQuote.htmlEncode(formData?.fullName),
                  Quantity: requestQuote.htmlEncode(formData?.quantity),
                  ItemNumber: requestQuote?.CurrentItemCell?.Item,
                  Brand: requestQuote?.CurrentItemCell?.ItemManufactory?.Manufactory,
                  ManufacturerPartNumber: requestQuote?.CurrentItemCell?.Model
              }),
              Email: requestQuote.htmlEncode(formData?.workEmail),
              PhoneNumber: `${formData?.phone}`,
              Organization: requestQuote.htmlEncode(formData?.organization),
              Address: requestQuote.htmlEncode(formData?.address),
              Question: requestQuote.htmlEncode(formData?.question || ""),
              TimeFrame: requestQuote.htmlEncode(formData?.timeFrame || ""),
              BuildID: requestQuote?.CurrentBuildID,
              ItemList: requestQuote.formatHtml([{ ItemNumber: requestQuote?.CurrentItemCell?.Item, Title: requestQuote?.CurrentItemCell?.Description?.Title, Quantity: requestQuote.htmlEncode(formData?.quantity), Price: requestQuote.formatNumber(requestQuote?.CurrentItemCell?.UnitCost - requestQuote?.CurrentItemCell?.InstantRebateAmount)}]),
          };
          return Object.keys(dataVariables)?.map((key) => ({ Name: `#DV_${key}#`, Value: dataVariables[key] }));
      },
      getCookieValue(name){
          let cookieList = document.cookie
              .split(";")
              .map(function (s) {
                  return s.trim();
              })
              .filter(function (t) {
                  return t;
              })
              .map(function (c) {
                  var list = c.split("=");
                  return { key: list[0], value: list[1] };
              });
          if (cookieList) {
              return cookieList.find(function (t) {
                  return t.key == name;
              });
          }
          return null;
      },
      getCustomerInfoFromCookie() {
          let loginInfo = requestQuote?.getCookieValue("CustomerLogin");
          return loginInfo ? JSON.parse(decodeURIComponent(loginInfo.value)) : null;
      },
      sendToQuoteRequestAPI(formData, emailContent, successCallback, errorCallback) {
          const reqBody = {
              CustomerNumber: requestQuote?.getCustomerInfoFromCookie()?.LoginId ?? 0,
              PhoneNumber: `${formData?.phone}`,
              FullName: formData?.fullName,
              CompanyName: formData?.organization,
              EmailAddress: formData?.workEmail,
              EmailContent: requestQuote.formatHtml([{ ItemNumber: requestQuote?.CurrentItemCell?.Item, Title: requestQuote?.CurrentItemCell?.Description?.Title, Quantity: formData?.quantity }]),
              Comment: formData?.question || "",
              ItemNumbers: [{ MainItemNumber: requestQuote?.CurrentItemCell?.Item, Quantity: formData?.quantity, ItemGroup: "Single" }],
              Source: requestQuote.PageName == "Product" || requestQuote.PageName == "ProductWithoutKeyword" ? 2 : 3,
              Address: formData?.address,
              TimeFrame: formData?.timeFrame || "",
              SellerID: requestQuote?.CurrentItemCell?.Seller?.SellerId ?? "",
              BuildID: requestQuote?.CurrentBuildID,
              EmailContentForNewSources: emailContent,
              Campaign: requestQuote?.getCookieValue("NV_MC_LC")?.value ?? "",
          };
          security.addSignatureParametersMaybe(window.location.origin + "/api/common/QuoteRequest", ({ url, headers }) => {
              $.ajax({
                  type: "POST",
                  url,
                  headers,
                  contentType: "application/json",
                  dataType: "json",
                  data: JSON.stringify(reqBody),
                  success: function (res) {
                      successCallback?.(res);
                  },
                  error: function (error) {
                      console.error(error);
                      errorCallback?.(error);
                  },
              });
          });
      },
      isDefaultRegion(countryCode) {
          return ['USA', 'CAN', 'US', 'CA', "USB"].includes((countryCode || '').toUpperCase());
      },
      buildPdpLink(itemNumber) {

          if (!itemNumber || !requestQuote.WWWDomain) return '';

          let path = `/p/${itemNumber}?item=${itemNumber}`
          if (!requestQuote.isDefaultRegion(requestQuote.CountryAlpha2)) {
              path = `/global/${requestQuote.CountryAlpha2.toLowerCase()}-en` + path;
          }

          const src = `https://${requestQuote.WWWDomain}${path}`


          return `<a href="${src}" title="${itemNumber}">${itemNumber}</a>`
      },
      formatHtml: function (itemList) {
          return `
      <table border="0" cellpadding="0" cellspacing="1" class="style1" style="mso-cellspacing: .7pt; mso-padding-alt: 0in 0in 0in 0in" width="100%">
        <tbody>
          <tr style="mso-yfti-irow:0;mso-yfti-firstrow:yes;height:11.6pt">
            <td style="width: 95.35pt; background: #999999; padding: .75pt .75pt .75pt .75pt; height: 11.6pt" width="127">
              <p class="MsoNormal">
                <b><span style="font-size:8.5pt;font-family:&quot;Verdana&quot;,&quot;sans-serif&quot;">Item Number</span></b>
              </p>
            </td>
            <td style="width: 207.25pt; background: #999999; padding: .75pt .75pt .75pt .75pt; height: 11.6pt" width="276">
              <p class="MsoNormal">
                <b style="mso-bidi-font-weight:normal"><span style="font-size:8.5pt;font-family:&quot;Verdana&quot;,&quot;sans-serif&quot;">Item Title</span></b>
              </p>
            </td>
            <td style="width: 59.95pt; background: #999999; padding: .75pt .75pt .75pt .75pt; height: 11.6pt" width="80">
              <p class="MsoNormal" style="text-align: center;">
                <b style="mso-bidi-font-weight:normal"><span style="font-size:8.5pt;font-family:&quot;Verdana&quot;,&quot;sans-serif&quot;">QTY</span></b>
              </p>
            </td>
            <td style="width: 59.95pt; background: #999999; padding: .75pt .75pt .75pt .75pt; height: 11.6pt" width="80">
              <p class="MsoNormal" style="text-align: center;">
                <b style="mso-bidi-font-weight:normal"><span style="font-size:8.5pt;font-family:&quot;Verdana&quot;,&quot;sans-serif&quot;">Start From</span></b>
              </p>
            </td>
          </tr>        
            ${itemList
                  ?.map((item) => {
                      return `<tr style="mso-yfti-irow:1;mso-yfti-lastrow:yes">
                <td style="width:95.35pt;padding:.75pt .75pt .75pt .75pt" width="127">
                  <p class="MsoNormal">
                    <span style="font-size:8.5pt;font-family:&quot;Verdana&quot;,&quot;sans-serif&quot;">
                      ${requestQuote.buildPdpLink(item?.ItemNumber)}
                      <o:p></o:p>
                    </span>
                  </p>
                </td>
                <td style="width:207.25pt;padding:.75pt .75pt .75pt .75pt" width="276">
                  <p class="MsoNormal">
                    <span style="font-size:8.5pt;font-family:&quot;Verdana&quot;,&quot;sans-serif&quot;">
                      ${item?.Title}
                      <o:p></o:p>
                    </span>
                  </p>
                </td>
                <td style="width:59.95pt;padding:0in 0in 0in 0in" width="80">
                  <p class="MsoNormal" style="text-align: center">
                    <span style="font-size:8.5pt;font-family:&quot;Verdana&quot;,&quot;sans-serif&quot;">
                      ${item?.Quantity || 1}
                      <o:p></o:p>
                    </span>
                  </p>
                </td>
                <td style="width:59.95pt;padding:0in 0in 0in 0in" width="80">
                  <p class="MsoNormal" style="text-align: center">
                    <span style="font-size:8.5pt;font-family:&quot;Verdana&quot;,&quot;sans-serif&quot;">
                      $${item?.Price}
                      <o:p></o:p>
                    </span>
                  </p>
                </td>
                `;
                  })
                  .join("")}
        </tbody>
      </table>
      `;
      },
      calculate: function (a, b, operator) {
          const multiplier = 100;
          switch (operator) {
              case "+":
                  return (+a * multiplier + +b * multiplier) / multiplier;
              case "-":
                  return (+a * multiplier - +b * multiplier) / multiplier;
              case "*":
                  return (+a * multiplier * (+b * multiplier)) / (multiplier * multiplier);
              case "/":
                  if (+b === 0) throw new Error("Division by zero is not allowed");
                  return (+a * multiplier) / (+b * multiplier);
              default:
                  throw new Error("Unsupported operator: " + operator);
          }
      },
      showModal: function (itemCell) {
          requestQuote.CurrentItemCell = itemCell;
          jQuery("body").append('<div class="modal-backdrop fade show" id="modal-quote-mask"></div>');
          jQuery("#modal-quote").show();
          jQuery("#modal-quote").addClass("show");
          jQuery("#modal-quote").attr("aria-modal", "true");
          jQuery("#modal-quote").removeAttr("aria-hide");
          jQuery("body").addClass("modal-open").css("padding-right", "17px");
          ReCaptcha.init("request-quote-recaptcha");
          requestQuote.initNSuggestAddress();
      },
      hideModal: function () {
          ReCaptcha.reset();
          jQuery("#modal-quote").hide();
          jQuery("#modal-quote").removeClass("show");
          jQuery("#modal-quote").removeAttr("aria-modal");
          jQuery("#modal-quote").attr("aria-hide", "true");
          jQuery("#modal-quote-mask").remove();
          jQuery("body").removeClass("modal-open").css("padding-right", "0px");
          requestQuote.CurrentItemCell = {};
          requestQuote.CurrentBuildID = null;
          requestQuote.toggleModal(false);
      },
      toggleModal: function (isShowSuccess) {
          if (isShowSuccess) {
              $("#modal-quote .modal-header .modal-title").html("We got it!");
              $("#modal-quote").addClass("show-success-staus");
          } else {
              $("#modal-quote .modal-header .modal-title").html("submit inquiry");
              $("#modal-quote").removeClass("show-success-staus");
              $("#modal-quote").removeClass("show-failed-staus");
          }
      },
      mutationObserverQuickView: function () {
          const observer = new MutationObserver(function (mutations) {
              mutations.forEach(function (mutation) {
                  if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
                      mutation.addedNodes.forEach(function (node) {
                          if ($(node).attr("id") == "Popup_Quickview") {
                              const contentObserver = new MutationObserver(function (contentMutations) {
                                  contentMutations.forEach(function (contentMutation) {
                                      if (contentMutation.type === "childList" && contentMutation.addedNodes.length > 0) {
                                          contentMutation.addedNodes.forEach(function (contentNode) {
                                              const $contentNode = $(contentNode);
                                              if ($contentNode.attr("class") == "grid-wrap" && Object.keys(requestQuote.CurrentItemCell || {}).length > 0) {
                                                  const isAutoNotify = $contentNode.find(".item-action .item-operate button.btn-secondary").text().trim() == "Auto Notify";
                                                  const modifiedItemCell = Object.assign({}, requestQuote.CurrentItemCell, { AddToCartType: isAutoNotify ? 4 : requestQuote.CurrentItemCell?.AddToCartType, Description: Object.assign({}, requestQuote.CurrentItemCell?.Description, { Title: $contentNode.find(".item-title").html() }) });
                                                  const actionType = requestQuote.checkAction(modifiedItemCell);
                                                  
                                                  if(actionType === RequestQuoteActionType.NOT_SUPPORTED){
                                                      return;
                                                  }
                                                  
                                                  requestQuote.addRequestQuote({
                                                      $selector: $contentNode?.find(".item-operate .item-button-area button.btn-secondary"),
                                                      itemCell: modifiedItemCell,
                                                      actionType: actionType,
                                                      callback: () => {
                                                          $contentNode.find(".item-info .item-promo").remove();
                                                          $contentNode?.find(".item-action .item-operate a.btn-secondary").css({ opacity: "0", "pointer-events": "none" });
                                                      },
                                                  });
                                              }
                                          });
                                      }
                                      contentObserver.disconnect();
                                  });
                              });
                              const config = { childList: true, subtree: true };
                              contentObserver.observe(node, config);
                          }
                      });
                  }
                  if (mutation.type === "childList" && mutation.removedNodes.length > 0) {
                      mutation.removedNodes.forEach(function (node) {
                          if ($(node).attr("id") == "Popup_Quickview") {
                              requestQuote.CurrentItemCell = {};
                          }
                      });
                  }
              });
          });
          const config = { childList: true };
          const bodyElement = document.querySelector("body");
          observer.observe(bodyElement, config);
      },
      checkAction: function (itemCell) {
          if (itemCell?.AddToCartType === 0 && ((requestQuote.CountryCode === "USB" && ["Product", "ProductWithoutKeyword"].includes(requestQuote.PageName)) || requestQuote.isAbsWorkstation(itemCell))) {
              return RequestQuoteActionType.ADD_REQUEST_QUOTE;
          }
          
          // check if it satisfies the regular RequestQuote conditions
          const hasAddToCartType4 = itemCell?.AddToCartType === 4;
          const isEligibleItem = requestQuote.Itemfilter.some(item => item.Subcategory === itemCell?.Subcategory?.RealSubCategoryId && (item.IncludeBrands.length === 0 || item.IncludeBrands.includes(itemCell?.ItemManufactory?.BrandId)));
          const userCanAccess = requestQuote.EnableQuoteForGuest || requestQuote.getCustomerInfoFromCookie()?.LoginId;
          const isSellerItem = itemCell?.Item?.indexOf("9SI") == 0;
          
          if (hasAddToCartType4 && isEligibleItem && userCanAccess && !isSellerItem) {
              return RequestQuoteActionType.Replace_REQUEST_QUOTE;
          }
          
          return RequestQuoteActionType.NOT_SUPPORTED;
      },
      init: function () {
          switch (requestQuote.PageName) {
              case "ProductWithoutKeyword":
              case "Product": {
                  const itemDetail = __initialState__.ItemDetail;
                  const sub = itemDetail?.Subscription || {};
                  requestQuote.syncUsbPdpSubscriptionQuoteVisibility(itemDetail);
                  if (sub.IsSubscription && sub.IsRegularSubscription && requestQuote.CountryCode === "USB") {
                      const syncQuoteVisibility = () => requestQuote.syncUsbPdpSubscriptionQuoteVisibility(itemDetail);
                      ["pushState", "replaceState"].forEach(function (method) {
                          const original = history[method];
                          history[method] = function () {
                              const result = original.apply(this, arguments);
                              syncQuoteVisibility();
                              return result;
                          };
                      });
                      window.addEventListener("popstate", syncQuoteVisibility);
                  }
                  if (requestQuote.CountryCode === "USB" && (sub.SubscriptionOnly || sub.IsSubscriptionOnly)) {
                      return;
                  }
                  const actionType = requestQuote.checkAction(itemDetail);
                  if(actionType === RequestQuoteActionType.NOT_SUPPORTED){
                      return;
                  }
                  
                  requestQuote.addRequestQuote({
                      $selector: requestQuote.isAddRequestQuoteAction(actionType) ? $("#ProductBuy .nav-row") : $(["#ProductBuy button.btn-secondary", ".product-bar .items-list-view .item-action button.btn-secondary"].join(",")),
                      itemCell: itemDetail,
                      actionType: actionType,
                      callback: (itemCell) => {
                          $(".product-bar .items-list-view .product-inventory, .product-buy-box .product-flag").remove();
                          requestQuote.applyPdpRequestQuoteCallback(itemCell);
                          requestQuote.syncUsbPdpSubscriptionQuoteVisibility(itemCell);
                      },
                  });
                  return;
              }
              case "BrandSubCat":
              case "SubCategory":
              case "Category":
              case "ProductList":
              case "BrandStore":
              case "TabStore": {
                  [...(__initialState__?.ProductDeals || []), __initialState__.FeatureItem , ...(__initialState__?.Products || [])]?.filter(Boolean)?.forEach((item) => {
                      const $itemCell = $(`.list-wrap .item-cells-wrap .item-cell #stock_${item?.ItemCell?.Item}`)?.parent();
                      const actionType = requestQuote.checkAction(item?.ItemCell);
                      if(actionType === RequestQuoteActionType.NOT_SUPPORTED){
                          return;
                      }
                      requestQuote.addRequestQuote({
                          $selector: requestQuote.isAddRequestQuoteAction(actionType) ?
                              $itemCell?.find(".item-operate .item-button-area button.btn-primary") : 
                              $itemCell?.find(".item-operate .item-button-area button.btn-secondary"),
                          itemCell: item?.ItemCell,
                          actionType: actionType,
                          callback: (itemCell) => {
                              $itemCell.find(".item-info .item-promo").remove();
                              $itemCell.find(".btn-quickview").on("click", function () {
                                  requestQuote.CurrentItemCell = itemCell;
                              });
                              requestQuote.applyPlpRequestQuoteCallback(itemCell, $itemCell);
                              $itemCell.find(".item-action li.item-msg").remove();
                          },
                      });
                  });
                  requestQuote.mutationObserverQuickView();
                  return;
              }
              case "EventSaleStore": { // deal items and featured items

                    // ───────────────────────────────────────────────────────────────
                    // ★ 新增：公共处理函数。把原来 Products/ProductDeals/FeatureItem 三段
                    //   完全重复的处理逻辑抽出来，containerSelector 用于区分
                    //   #Product_List（普通/deal/extra 商品）和 #Swiper_Section_1（featured 商品）。
                    //   行为与原代码逐行一致，仅多了一个 "已是报价按钮则跳过" 的保护。
                    // ───────────────────────────────────────────────────────────────
                    const processEventItems = (items, containerSelector) => {                              // ★ 新增
                        [...(items || [])]?.filter(Boolean)?.forEach((item) => {                            // ★ 新增
                            const $itemCell = $(`${containerSelector} #stock_${item?.ItemCell?.Item}`)?.parent();

                            // ★ 新增：卡片未渲染、或已经被替换成 Request A quote 按钮时跳过，避免重复处理
                            if ($itemCell.length === 0 || $itemCell.find('a[data-toggle="modal"]').length > 0) { // ★ 新增
                                return;                                                                     // ★ 新增
                            }                                                                               // ★ 新增

                            const actionType = requestQuote.checkAction(item?.ItemCell);
                            if (actionType === RequestQuoteActionType.NOT_SUPPORTED) {
                                return;
                            }
                            requestQuote.addRequestQuote({
                                $selector: $itemCell?.find(".goods-button-area button"),
                                itemCell: item?.ItemCell,
                                actionType: actionType,
                                callback: (itemCell) => {
                                    $itemCell.find(".goods-price-soldout").remove();
                                    $itemCell.find(".goods-msg").hide();
                                    if (!itemCell.CanPreLaunch) {
                                        $itemCell.find(".goods-price-note").text(
                                            $itemCell.find(".goods-price-note").text().replace(/Sold Price/i, 'Starting From')
                                        );
                                    }
                                    $itemCell.find(".fa-caret-right").remove();
                                },
                            });
                        });                                                                                 // ★ 新增
                    };                                                                                      // ★ 新增

                    // ───────────────────────────────────────────────────────────────
                    // ★ 新增：首屏统一处理 + DOM 就绪重试。
                    //   原代码在 init 时同步遍历，若 #Product_List 服务端 HTML 尚未就绪，
                    //   选择器会命中为空导致漏处理（这是 ProductDeals 里 Dell 漏按钮的根因之一）。
                    //   这里最多重试 20 次（间隔 150ms ≈ 3s），DOM 就绪后再统一处理。
                    // ───────────────────────────────────────────────────────────────
                    const runEventSaleStore = (retry = 0) => {                                              // ★ 新增
                        if ($('#Product_List [id^="stock_"]').length === 0 && retry < 20) {                 // ★ 新增
                            return setTimeout(() => runEventSaleStore(retry + 1), 150);                     // ★ 新增
                        }                                                                                   // ★ 新增

                        // 原有来源：Products / ProductDeals 渲染在 #Product_List
                        processEventItems(__initialState__?.Products, "#Product_List");                     // (原逻辑，改为调用公共函数)
                        processEventItems(__initialState__?.ProductDeals, "#Product_List");                 // (原逻辑，改为调用公共函数)

                        // 原有来源：FeatureItem 渲染在 #Swiper_Section_1（当前为空数组，后台维护后自动生效）
                        processEventItems(__initialState__?.FeatureItem, "#Swiper_Section_1");              // (原逻辑，改为调用公共函数)

                        // ★ 新增：复用现成的 processEventSaleStoreItems() 处理首屏 extraDeals
                        //   （extraDeals 也渲染在 #Product_List；该函数内部已带去重保护，
                        //    与上面 #Product_List 的处理不会重复加按钮）
                        requestQuote.processEventSaleStoreItems();                                          // ★ 新增
                    };                                                                                      // ★ 新增

                    runEventSaleStore();                                                                    // ★ 新增

                    requestQuote.mutationObserverQuickView();
                    requestQuote.initEventSaleStoreObserver();
                    return;
                }
              case "BrandStore2023": {
                  this.brandStoreReplaceBtn();
                  this.initBrandStoreObserver();
                  requestQuote.mutationObserverQuickView();
                  return;
              }
              default: {
                  return;
              }
          }
      },
      scrollTimer: null,
      brandStoreObserver: null,
      initBrandStoreObserver: function () {
          const observerTarget = document.body;
          if (!observerTarget) return;

          if (this.brandStoreObserver) {
              this.brandStoreObserver.disconnect();
          }

          this.brandStoreObserver = new MutationObserver((mutationsList) => {
              let shouldTrigger = false;

              for (const mutation of mutationsList) {
                  for (const node of mutation.addedNodes) {
                      if (node.nodeType === 1) {
                          if (node.querySelector?.('[id^="item_cell_"]')) {
                              shouldTrigger = true;
                              break;
                          }
                      }
                  }
                  if (shouldTrigger) break;
              }

              if (shouldTrigger) {
                  if (this.scrollTimer !== null) {
                      clearTimeout(this.scrollTimer);
                  }

                  this.scrollTimer = setTimeout(() => {
                      this.brandStoreReplaceBtn();
                  }, 300);
              }
          });

          this.brandStoreObserver.observe(observerTarget, {
              childList: true,
              subtree: true,
          });
      },
      GetReactInternalInstanceValue: function (element) {
          let reactInternalInstance = null;
          for (let key in element) {
              // Support React 16 (__reactInternalInstance) and React 17+ (__reactFiber$)
              if (key.startsWith('__reactInternalInstance') || key.startsWith('__reactFiber$')) {
                  reactInternalInstance = element[key];
                  break;
              }
          }
          return reactInternalInstance;
      },
      brandStoreReplaceBtn: function () {
          if (jQuery('.grid-col.col-wide [id^="item_cell_"]').length == 0) {
              return;
          }
          var reactInstance = this.GetReactInternalInstanceValue($('.grid-col.col-wide [id^="item_cell_"]').first().parent().get(0));
          if (!reactInstance || !reactInstance.return || !reactInstance.return.memoizedProps || !reactInstance.return.memoizedProps.productDeals) {
              return;
          }
          var products = reactInstance.return.memoizedProps.productDeals;
          products.filter(Boolean)?.forEach((item) => {
              //[...(__initialState__?.ProductDeals || []), ...(__initialState__?.Products || []), ...(__initialState__?.AllProductsTabInfo?.initialState?.Products || [])]?.filter(Boolean)?.forEach((item) => {
              const $itemCell = $(`#stock_${item?.ItemCell?.Item}`)?.parent();
              const actionType = requestQuote.checkAction(item?.ItemCell);
              
              if(actionType === RequestQuoteActionType.NOT_SUPPORTED){
                  return;
              }
              
              requestQuote.addRequestQuote({
                  $selector: $itemCell?.find(".goods-button-area button"),
                  itemCell: item?.ItemCell,
                  actionType: actionType,
                  callback: (itemCell) => {
                      $itemCell.find(".goods-price-soldout").remove();
                      $itemCell.find(".goods-msg").hide();
                      if(!itemCell.CanPreLaunch){
                          $itemCell.find(".goods-price-note").text($itemCell.find(".goods-price-note").text().replace(/Sold Price/i, 'Starting From'));
                      }
                      $itemCell.find(".fa-caret-right").remove();
                  },
              });
          });
      },
      raiseQuoteItem: function () {
          switch (requestQuote.PageName) {
              case "BrandSubCat":
              case "SubCategory":
              case "ProductList": {
                  var quoteItems = [];
                  var normalItems = [];
                  var whiteList = ["59-240-014", "16-202-194", "16-139-431", "16-139-437", "16-139-381", "16-139-442", "16-139-440", "16-139-444", "16-139-439", "16-202-197", "59-252-005", "16-202-198", "16-152-209"];
                  (__initialState__?.Products || []).filter(Boolean)?.forEach((item) => {
                      if (whiteList.includes(item?.ItemCell?.Item)) {
                          quoteItems.push(item?.ItemCell?.Item);
                      } else {
                          if (item?.SponsoredMsg == null) {
                              normalItems.push(item?.ItemCell?.Item);
                          }
                      }
                  });
                  if (quoteItems.length != 0 && normalItems.length != 0) {
                      quoteItems.sort((a, b) => whiteList.indexOf(a) - whiteList.indexOf(b));
                      var index = 0;
                      for (var quoteItem of quoteItems) {
                          var a = document.querySelectorAll(".list-wrap .item-cell:not(.width-100)");
                          var b = document.getElementById(quoteItem);
                          if (a[index]?.id && b?.parentNode?.id) {
                              requestQuote.changePosition(a[index]?.id, b?.parentNode?.id);
                              index = index + 1;
                          }
                      }
                  }
              }
              default: {
                  return;
              }
          }
      },
      changePosition: function (a, b) {
          var element1 = document.getElementById(a);
          var element2 = document.getElementById(b);
          var parent1 = element1.parentNode;
          var nextSibling1 = element1.nextSibling;
          var parent2 = element2.parentNode;
          var nextSibling2 = element2.nextSibling;
          var placeholder = document.createElement("div");
          parent1.insertBefore(placeholder, element1);
          parent1.insertBefore(element2, placeholder);
          parent2.insertBefore(placeholder, nextSibling2);
          parent2.insertBefore(element1, placeholder);
          parent2.removeChild(placeholder);
      },
      createBuildID: function () {
          const now = new Date();
          const year = now.getFullYear();
          const month = String(now.getMonth() + 1).padStart(2, "0");
          const day = String(now.getDate()).padStart(2, "0");
          const hours = String(now.getHours()).padStart(2, "0");
          const minutes = String(now.getMinutes()).padStart(2, "0");
          const seconds = String(now.getSeconds()).padStart(2, "0");
          const randomNumber = String(Math.floor(Math.random() * 100)).padStart(2, '0');
          return `Build-${year}${month}${day}${hours}${minutes}${seconds}-${randomNumber}`;
      },
      formatNumber: function(num) {
          var str = num.toFixed(2);
          var parts = str.split('.');
          var integer = parts[0];
          var decimal = parts[1];
          var formattedInteger = integer.replace(/(\d)(?=(\d{3})+$)/g, '$1,');
          return formattedInteger + (decimal ? '.' + decimal : '');
      },
      eventSaleStoreObserver: null,
      eventSaleStoreTimer: null,
      processEventSaleStoreItems: function() {
          // Process extraDeals that were loaded dynamically
          [...(__initialState__?.extraDeals || [])]?.filter(Boolean)?.forEach((item) => {
              const $itemCell = $(`#Product_List #stock_${item?.ItemCell?.Item}`)?.parent();
              // Skip if already processed (button already replaced)
              if ($itemCell.length === 0 || $itemCell.find('a[data-toggle="modal"]').length > 0) {
                  return;
              }
              const actionType = requestQuote.checkAction(item?.ItemCell);
              if(actionType === RequestQuoteActionType.NOT_SUPPORTED){
                  return;
              }
              requestQuote.addRequestQuote({
                  $selector: $itemCell?.find(".goods-button-area button"),
                  itemCell: item?.ItemCell,
                  actionType: actionType,
                  callback: (itemCell) => {
                      $itemCell.find(".goods-price-soldout").remove();
                      $itemCell.find(".goods-msg").hide();
                      if (!itemCell.CanPreLaunch) {
                          $itemCell.find(".goods-price-note").text($itemCell.find(".goods-price-note").text().replace(/Sold Price/i, 'Starting From'));
                      }
                      $itemCell.find(".fa-caret-right").remove();
                  },
              });
          });
      },
      initEventSaleStoreObserver: function() {
          const observerTarget = document.body;
          if (!observerTarget) return;

          if (this.eventSaleStoreObserver) {
              this.eventSaleStoreObserver.disconnect();
          }

          this.eventSaleStoreObserver = new MutationObserver((mutationsList) => {
              let shouldTrigger = false;

              for (const mutation of mutationsList) {
                  for (const node of mutation.addedNodes) {
                      if (node.nodeType === 1) {
                          // Check if new items with stock_ prefix are added to #Product_List
                          const $node = $(node);
                          if ($node.attr('id') && $node.attr('id').startsWith('stock_')) {
                              shouldTrigger = true;
                              break;
                          }
                          if ($node.find('[id^="stock_"]').length > 0 || $node.closest('#Product_List').length > 0) {
                              shouldTrigger = true;
                              break;
                          }
                      }
                  }
                  if (shouldTrigger) break;
              }

              if (shouldTrigger) {
                  if (this.eventSaleStoreTimer !== null) {
                      clearTimeout(this.eventSaleStoreTimer);
                  }

                  this.eventSaleStoreTimer = setTimeout(() => {
                      this.processEventSaleStoreItems();
                  }, 300);
              }
          });

          this.eventSaleStoreObserver.observe(observerTarget, {
              childList: true,
              subtree: true,
          });
      }
  };

  window.requestQuoteRender = window.requestQuoteRender || {
      renderRecommendItems: function(items) {
          if (!Array.isArray(items) || items.length === 0) {
              return;
          }
          
          items.forEach(function(itemData) {
            const { item, UiTemplate } = itemData;
              if (!item?.ItemInfo) {
                  return;
              }
              
              const actionType = requestQuote.checkAction(item?.ItemInfo);
              if (actionType === RequestQuoteActionType.NOT_SUPPORTED || !item?.ItemInfo?.Feature?.AllowRequestQuote) {
                  return;
              }
              
              setTimeout(function() {
                  const $itemCell = $(`div[data-template-id="${UiTemplate}"] #stock_${item?.ItemInfo?.Item}`).parent();
                  
                  if ($itemCell.length > 0) {
                      if ($itemCell.data('request-quote-processed')) {
                          return;
                      }
                      $itemCell.data('request-quote-processed', true);
                      
                      let $buttonSelector;
                      if (requestQuote.isAddRequestQuoteAction(actionType)) {
                          $buttonSelector = $itemCell.find(".item-operate .item-button-area button.btn-primary, .item-operate .item-button-area a.btn-tertiary").first();
                      } else {
                          $buttonSelector = $itemCell.find(".item-operate .item-button-area button.btn-secondary");
                      }
                      
                      if ($buttonSelector.length > 0) {
                          requestQuote.addRequestQuote({
                              $selector: $buttonSelector,
                              itemCell: item?.ItemInfo,
                              actionType: actionType,
                              callback: function(itemCell) {
                                  $itemCell.find(".item-info .item-promo").remove();
                                  if (requestQuote.isAbsWorkstation(itemCell) && !itemCell.CanPreLaunch) {
                                      $itemCell.find(".price .price-current").prepend('<span class="item-msg">Starting from </span>');
                                  }
                                  $itemCell.find(".item-action li.item-msg").remove();
                              }
                          });
                      }
                  }
              }, 100);
          });
      }
  };

  $(document).ready(function () {
      try {
          jQuery.cachedScript1 = function (url, options) {
              options = jQuery.extend(options || {}, { dataType: "script", cache: true, url: url });
              return jQuery.ajax(options);
          };
          //requestQuote.raiseQuoteItem();
          requestQuote.requestQuotePopup();
          requestQuote.init();
      } catch (e) {
          console.error(e);
      }
  });
})();