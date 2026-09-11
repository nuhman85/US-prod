jQuery(document).ready(function () {
  try {
    var targetSubIds = [727,302,8,541,410,412,520,803,449,2021,510,30,582,386,3087,2982,509,124];
    if (typeof __initialState__ === 'undefined' ||
        typeof __initialState__.Products === 'undefined' ||
        __initialState__.Products == null ||
        __initialState__.Products.length <= 0) {
      return;
    }
    var subIds = [];
    for (var i = 0; i < __initialState__.Products.length; i++) {
      if(__initialState__.Products[i].ItemCell != null && 
         __initialState__.Products[i].ItemCell.Subcategory != null &&
         __initialState__.Products[i].ItemCell.Subcategory.SubcategoryId > 0) {
        subIds.push(__initialState__.Products[i].ItemCell.Subcategory.SubcategoryId);
      }
    }
    
    var targetSubSet = new Set(targetSubIds);
    var commonItems = subIds.filter(function(item){ return targetSubSet.has(item); });
    if(commonItems.length <= 0){
      return;
    }
    if(jQuery(".btn-save-search").length <= 0){
      return;
    }
    var html = '<a href="javascript:newegg_request_item_feedback && newegg_request_item_feedback.show();" class="btn btn-primary nav-x-body-top-bar-right margin-right" title="Request a server item" style="cursor: pointer;"><i class="fa fa-comment-alt-edit"></i>&nbsp;Request a server item</a>';
    jQuery(".btn-save-search").parent().append(html);
  } catch (_a) {}
});
