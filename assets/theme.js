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

  // Expose for panel
  window.ThemeManager = {
    PRESETS, applyVars, applyFont, saveTheme, loadTheme
  };

  document.addEventListener('DOMContentLoaded', ()=>{
    applyStored();

    // If panel exists, wire the UI
    const panel = document.getElementById('theme-manager');
    if(!panel) return;

    const presetContainer = document.getElementById('presets');
    const colorInputs = {
      guinda: document.getElementById('color-guinda'),
      dorado: document.getElementById('color-dorado'),
      blanco: document.getElementById('color-blanco'),
      texto: document.getElementById('color-texto')
    };
    const fontSelect = document.getElementById('fontSelect');
    const applyBtn = document.getElementById('applyPreview');
    const saveBtn = document.getElementById('saveTheme');
    const resetBtn = document.getElementById('resetTheme');

    // build preset buttons
    Object.keys(PRESETS).forEach(name=>{
      const btn = document.createElement('button');
      btn.type='button'; btn.className='preset-btn'; btn.textContent = name.charAt(0).toUpperCase()+name.slice(1);
      btn.addEventListener('click', ()=>{
        const vars = PRESETS[name]; applyVars(vars); applyFont(fontSelect.value);
        saveTheme({ type:'preset', name, font: fontSelect.value });
        showStatus('Tema aplicado: '+name);
      });
      presetContainer.appendChild(btn);
    });

    // populate inputs from current stored or defaults
    const stored = loadTheme();
    if(stored){
      if(stored.type==='preset' && PRESETS[stored.name]){
        const vars = PRESETS[stored.name];
        colorInputs.guinda.value = vars['--guinda'] || '#000000';
        colorInputs.dorado.value = vars['--dorado'] || '#000000';
        colorInputs.blanco.value = vars['--blanco'] || '#ffffff';
        colorInputs.texto.value = vars['--texto'] || '#111111';
      } else if(stored.type==='custom' && stored.vars){
        colorInputs.guinda.value = stored.vars['--guinda'] || '#000000';
        colorInputs.dorado.value = stored.vars['--dorado'] || '#000000';
        colorInputs.blanco.value = stored.vars['--blanco'] || '#ffffff';
        colorInputs.texto.value = stored.vars['--texto'] || '#111111';
      }
      if(stored.font) fontSelect.value = stored.font;
    }

    applyBtn.addEventListener('click', ()=>{
      const vars = {
        '--guinda': colorInputs.guinda.value,
        '--dorado': colorInputs.dorado.value,
        '--blanco': colorInputs.blanco.value,
        '--texto': colorInputs.texto.value
      };
      applyVars(vars); applyFont(fontSelect.value);
      showStatus('Vista previa aplicada');
    });

    saveBtn.addEventListener('click', ()=>{
      const vars = {
        '--guinda': colorInputs.guinda.value,
        '--dorado': colorInputs.dorado.value,
        '--blanco': colorInputs.blanco.value,
        '--texto': colorInputs.texto.value
      };
      saveTheme({ type:'custom', vars, font: fontSelect.value });
      showStatus('Tema guardado');
    });

    resetBtn.addEventListener('click', ()=>{
      localStorage.removeItem(KEY);
      applyVars(PRESETS.verde);
      applyFont('"Open Sans", sans-serif');
      showStatus('Restaurado al tema por defecto');
    });

    function showStatus(msg){
      const el = document.getElementById('status');
      if(!el) return; el.textContent = msg; el.style.opacity=1; setTimeout(()=>el.style.opacity=0,2500);
    }
  });
})();
