(function(){
  const KEY = 'siteTheme';
  const PRESETS = {
    verde: {
      '--guinda': '#1f4f25','--guinda-dark':'#112b17','--guinda-light':'#3f7f4d',
      '--dorado':'#6a8b32','--dorado-light':'#9fb68d','--dorado-pale':'#d9e7d8',
      '--blanco':'#f3f0ec','--gris-claro':'#e6dfd8','--gris-medio':'#c9bfb5',
      '--texto':'#141414','--texto-suave':'#4a4a4a'
    },
    naranja: {
      '--guinda':'#b25c00','--guinda-dark':'#8d4000','--guinda-light':'#cc8337',
      '--dorado':'#c58c00','--dorado-light':'#e0b648','--dorado-pale':'#f3e5cf',
      '--blanco':'#fff7ee','--gris-claro':'#fbf6f0','--gris-medio':'#efe6d8',
      '--texto':'#2b2b2b','--texto-suave':'#5a5a5a'
    },
    azul: {
      '--guinda':'#104a8c','--guinda-dark':'#0b2f5e','--guinda-light':'#2f79c0',
      '--dorado':'#1da0c3','--dorado-light':'#64c5db','--dorado-pale':'#cadfe7',
      '--blanco':'#f6fbff','--gris-claro':'#eef6fb','--gris-medio':'#dbeef8',
      '--texto':'#0f1724','--texto-suave':'#4b5563'
    },
    vino: {
      '--guinda':'#4f132f','--guinda-dark':'#26070f','--guinda-light':'#6b1f42',
      '--dorado':'#8b6e27','--dorado-light':'#a88f3d','--dorado-pale':'#d8ccb1',
      '--blanco':'#f3f0ec','--gris-claro':'#e6dfd8','--gris-medio':'#c9bfb5',
      '--texto':'#141414','--texto-suave':'#4a4a4a'
    }
  };

  function applyVars(vars){
    const root = document.documentElement;
    Object.entries(vars||{}).forEach(([k,v])=>{
      try{ root.style.setProperty(k, v); }catch(e){}
    });
    if(vars && vars['--blanco']){
      root.style.setProperty('--card', vars['--blanco']);
    }
    if(vars && vars['--texto-suave']){
      root.style.setProperty('--muted', vars['--texto-suave']);
    }
  }

  function applyFont(font){
    let el = document.getElementById('theme-font-override');
    const safe = font || '';
    const css = `body, input, textarea, select, button, .logo-text, .nav-links a, h1,h2,h3,h4,h5 { font-family: ${safe}; }`;
    if(!el){ el = document.createElement('style'); el.id='theme-font-override'; document.head.appendChild(el); }
    el.textContent = css;
  }

  function saveTheme(obj){ localStorage.setItem(KEY, JSON.stringify(obj)); }
  function loadTheme(){ try{ return JSON.parse(localStorage.getItem(KEY)); }catch(e){return null;} }

  function applyStored(){
    const stored = loadTheme();
    if(!stored) return;
    if(stored.type === 'preset' && PRESETS[stored.name]){
      applyVars(PRESETS[stored.name]);
    } else if(stored.type === 'custom' && stored.vars){
      applyVars(stored.vars);
    }
    if(stored.font) applyFont(stored.font);
  }

  // Expose public helpers
  window.ThemeManager = {
    PRESETS, applyVars, applyFont, saveTheme, loadTheme
  };

  function updateSwatchState(activeName){
    document.querySelectorAll('[data-theme-preset]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.themePreset === activeName);
    });
  }

  function bindThemeSwatches(){
    const swatches = document.querySelectorAll('[data-theme-preset]');
    if(!swatches.length) return;

    swatches.forEach(btn => {
      const preset = btn.dataset.themePreset;
      if(!PRESETS[preset]) return;

      btn.addEventListener('click', () => {
        const vars = PRESETS[preset];
        applyVars(vars);
        const stored = loadTheme() || {};
        saveTheme({ type:'preset', name: preset, font: stored.font || '"Open Sans", sans-serif' });
        document.documentElement.dataset.theme = preset;
        updateSwatchState(preset);
      });
    });
  }

  function initTheme(){
    applyStored();
    const stored = loadTheme();
    if(stored && stored.type === 'preset' && stored.name){
      document.documentElement.dataset.theme = stored.name;
      updateSwatchState(stored.name);
    }
    bindThemeSwatches();
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', initTheme);
  } else {
    initTheme();
  }
})();
