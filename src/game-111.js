// v14.3.0 release metadata — resident-perspective release candidate.
(function(){
 const BUILD_LABEL_V111='v14.3.0 RC';
 window.SCORCH_BUILD_LABEL=BUILD_LABEL_V111;
 const meta=[...document.querySelectorAll('#demoEntry .demo-entry__meta span')];
 if(meta[1])meta[1].textContent=BUILD_LABEL_V111;
})();
