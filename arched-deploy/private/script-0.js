
window.__archedHealthErrors=[];
window.addEventListener('error',function(e){window.__archedHealthErrors.push(String(e.message||e.error||'Unknown error'));});
window.addEventListener('unhandledrejection',function(e){window.__archedHealthErrors.push(String(e.reason||'Unhandled promise rejection'));});
