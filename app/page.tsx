'use client';

import { useState, useEffect } from 'react';

const SYSTEM_PROMPT = `Eres MNQ Order Flow Analyst, un trader experimentado que opera MNQ. 
Analiza las imágenes que se te envían (pueden ser 1 o 2). 
La primera imagen es Order Flow. La segunda (si existe) es GEXBOT / Niveles.
Responde SIEMPRE en español, siguiendo EXACTAMENTE esta estructura:

1. **Sincronización de Timestamps**
   - Hora en la imagen (precio): [extrae exactamente]
   - Hora actual del análisis: [actual]

2. **Resumen General del Mercado** (máximo 2 frases)

3. **Análisis Order Flow** (detallado)

4. **Análisis GEXBOT Nivel 3** (si se envió la segunda imagen)

5. **Confluencia y Bias Integrado**

6. **Setup Recomendado**
   - Entrada:
   - Stop Loss: (nunca mayor a 40 puntos)
   - Target 1:
   - Target 2:
   - Probabilidad estimada: XX% (solo si ≥ 75%)

7. **Riesgos clave**

Reglas obligatorias:
- Stop Loss nunca mayor a 40 puntos.
- Solo proponer setup si confluencia ≥ 75%. Si no, di claramente 'Sin setup de alta probabilidad en este momento'.
- Saluda con: '✅ MNQ Order Flow Analyst listo.'
- Termina con: '¿Quieres que profundice en algún nivel o analice otra imagen?'`;

export default function OrderFlowAnalyzer() {
  const [provider, setProvider] = useState<'gemini' | 'grok'>('gemini');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('gemini-2.5-flash'); // ← Modelo actual y funcional

  const [orderFlowBase64, setOrderFlowBase64] = useState('');
  const [gexbotBase64, setGexbotBase64] = useState('');
  const [analysis, setAnalysis] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('mnq_ai_settings');
    if (saved) {
      const s = JSON.parse(saved);
      setProvider(s.provider || 'gemini');
      setApiKey(s.apiKey || '');
      setModel(s.model || 'gemini-2.5-flash');
    }
  }, []);

  const saveSettings = () => {
    localStorage.setItem('mnq_ai_settings', JSON.stringify({ provider, apiKey, model }));
    alert('✅ Configuración guardada');
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>, isOrderFlow: boolean) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = (ev.target?.result as string).split(',')[1] || '';
      if (isOrderFlow) setOrderFlowBase64(base64);
      else setGexbotBase64(base64);
    };
    reader.readAsDataURL(file);
  };

  const analyze = async () => {
    if (!apiKey.trim()) return alert('❌ Ingresa tu API Key');
    if (!orderFlowBase64) return alert('❌ Sube al menos la imagen de Order Flow');

    setLoading(true);
    setAnalysis('');

    try {
      const currentModel = model.trim() || 'gemini-2.5-flash';

      let url: string;
      let headers: any = { 'Content-Type': 'application/json' };
      let body: any;

      if (provider === 'gemini') {
        const parts: any[] = [
          { text: SYSTEM_PROMPT },
          { inline_data: { mime_type: 'image/png', data: orderFlowBase64 } }
        ];
        if (gexbotBase64) parts.push({ inline_data: { mime_type: 'image/png', data: gexbotBase64 } });

        url = `https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent?key=${apiKey.trim()}`;
        body = { contents: [{ parts }] };
      } else {
        const userContent: any[] = [
          { type: 'text', text: SYSTEM_PROMPT },
          { type: 'image_url', image_url: { url: `data:image/png;base64,${orderFlowBase64}` } }
        ];
        if (gexbotBase64) userContent.push({ type: 'image_url', image_url: { url: `data:image/png;base64,${gexbotBase64}` } });

        url = 'https://api.x.ai/v1/chat/completions';
        headers.Authorization = `Bearer ${apiKey.trim()}`;
        body = {
          model: currentModel,
          messages: [{ role: 'system', content: SYSTEM_PROMPT }, { role: 'user', content: userContent }],
          max_tokens: 3000
        };
      }

      const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Error ${res.status}: ${errText.substring(0, 400)}`);
      }

      const data = await res.json();
      const text = provider === 'gemini' 
        ? data.candidates?.[0]?.content?.parts?.[0]?.text 
        : data.choices?.[0]?.message?.content;

      setAnalysis(text || 'No se recibió respuesta.');
    } catch (err: any) {
      setAnalysis(`❌ Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6 font-mono">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-4xl font-bold text-lime-400">🚀 MNQ Order Flow AI Analyst</h1>
        <p className="text-zinc-400">Modelo libre • gemini-2.5-flash recomendado</p>

        {/* Configuración */}
        <div className="mt-8 bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <h2 className="text-xl font-semibold mb-4">⚙️ Configuración</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Proveedor</label>
              <select value={provider} onChange={e => setProvider(e.target.value as 'gemini' | 'grok')} className="w-full bg-zinc-800 border border-zinc-700 p-3 rounded-lg">
                <option value="gemini">Google Gemini</option>
                <option value="grok">xAI Grok</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Modelo (cámbialo aquí)</label>
              <input 
                type="text" 
                value={model} 
                onChange={e => setModel(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 p-3 rounded-lg"
              />
              <p className="text-xs text-lime-400 mt-1">Ejemplo: gemini-2.5-flash o gemini-2.5-flash-lite</p>
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1">API Key</label>
              <input 
                type="password" 
                value={apiKey} 
                onChange={e => setApiKey(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 p-3 rounded-lg"
              />
            </div>
          </div>
          <button onClick={saveSettings} className="mt-4 bg-lime-500 hover:bg-lime-600 text-black font-bold px-8 py-3 rounded-xl">
            💾 Guardar Configuración
          </button>
        </div>

        {/* Imágenes */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <h3 className="text-lime-400 font-semibold mb-3">📸 Order Flow (obligatorio)</h3>
            <input type="file" accept="image/png" onChange={e => handleFile(e, true)} className="w-full" />
            {orderFlowBase64 && <img src={`data:image/png;base64,${orderFlowBase64}`} className="mt-4 max-h-80 rounded-xl" />}
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <h3 className="text-amber-400 font-semibold mb-3">📸 GEXBOT (opcional)</h3>
            <input type="file" accept="image/png" onChange={e => handleFile(e, false)} className="w-full" />
            {gexbotBase64 && <img src={`data:image/png;base64,${gexbotBase64}`} className="mt-4 max-h-80 rounded-xl" />}
          </div>
        </div>

        <button
          onClick={analyze}
          disabled={loading || !orderFlowBase64}
          className="mt-10 w-full h-20 text-2xl font-bold bg-gradient-to-r from-lime-500 to-green-600 rounded-3xl disabled:opacity-50"
        >
          {loading ? '⏳ Analizando con IA...' : '🚀 EJECUTAR ANÁLISIS MNQ'}
        </button>

        {analysis && (
          <div className="mt-10 bg-zinc-900 border border-zinc-700 rounded-3xl p-8 whitespace-pre-wrap text-base leading-relaxed">
            {analysis}
          </div>
        )}
      </div>
    </div>
  );
}
