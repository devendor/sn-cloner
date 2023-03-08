(function($) {
    // TODO: make the node ID configurable
    var treeNode = $('#jsdoc-toc-nav');

    // initialize the tree
    treeNode.tree({
        autoEscape: false,
        closedIcon: '&#x21e2;',
        data: [{"label":"<a href=\"module-sn-cloner.html\">sn-cloner</a>","id":"module:sn-cloner","children":[{"label":"<a href=\"module-sn-cloner.CloneUtil.html\">CloneUtil</a>","id":"module:sn-cloner.CloneUtil","children":[]}]}],
        openedIcon: ' &#x21e3;',
        saveState: false,
        useContextMenu: false
    });

    // add event handlers
    // TODO
})(jQuery);
