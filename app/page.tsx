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

export default function Home() {
  const [provider, setProvider] = useState<'gemini' | 'grok'>('gemini');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('gemini-2.5-flash');

  const [orderFlowBase64, setOrderFlowBase64] = useState<string>('');
  const [gexbotBase64, setGexbotBase64] = useState<string>('');
  const [analysis, setAnalysis] = useState('');
  const [loading, setLoading] = useState(false);

  const geminiModels = ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-3.1-pro-preview'];
  const grokModels = ['grok-2-vision'];

  useEffect(() => {
    const savedKey = localStorage.getItem('of_ai_key');
    const savedProvider = localStorage.getItem('of_ai_provider') as 'gemini' | 'grok';
    const savedModel = localStorage.getItem('of_ai_model');
    if (savedKey) setApiKey(savedKey);
    if (savedProvider) setProvider(savedProvider);
    if (savedModel) setModel(savedModel);
  }, []);

  const saveSettings = () => {
    localStorage.setItem('of_ai_key', apiKey);
    localStorage.setItem('of_ai_provider', provider);
    localStorage.setItem('of_ai_model', model);
    alert('✅ Configuración guardada');
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>, isOrderFlow: boolean) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = (ev.target?.result as string).split(',')[1];
      if (isOrderFlow) setOrderFlowBase64(base64);
      else setGexbotBase64(base64);
    };
    reader.readAsDataURL(file);
  };

  const analyze = async () => {
    if (!apiKey) return alert('❌ Ingresa tu API Key');
    if (!orderFlowBase64) return alert('❌ Sube al menos la imagen de Order Flow');

    setLoading(true);
    setAnalysis('');

    try {
      let url: string;
      let body: any;

      if (provider === 'gemini') {
        const parts = [
          { text: SYSTEM_PROMPT },
          { inline_data: { mime_type: 'image/png', data: orderFlowBase64 } }
        ];
        if (gexbotBase64) {
          parts.push({ inline_data: { mime_type: 'image/png', data: gexbotBase64 } });
        }

        url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        body = { contents: [{ parts }] };
      } else {
        // Grok / xAI (OpenAI compatible)
        const userContent: any[] = [
          { type: 'text', text: 'Analiza estas imágenes siguiendo exactamente las instrucciones del system prompt.' },
          { type: 'image_url', image_url: { url: `data:image/png;base64,${orderFlowBase64}` } }
        ];
        if (gexbotBase64) {
          userContent.push({ type: 'image_url', image_url: { url: `data:image/png;base64,${gexbotBase64}` } });
        }

        url = 'https://api.x.ai/v1/chat/completions';
        body = {
          model: model,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: userContent }
          ],
          max_tokens: 2500,
          temperature: 0.7
        };
      }

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(provider === 'grok' && { Authorization: `Bearer ${apiKey}` })
        },
        body: JSON.stringify(body)
      });

      const data = await res.json();

      let text = '';
      if (provider === 'gemini') {
        text = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Error al leer respuesta de Gemini';
      } else {
        text = data.choices?.[0]?.message?.content || 'Error al leer respuesta de Grok';
      }

      setAnalysis(text);
    } catch (err: any) {
      setAnalysis(`❌ Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6 font-mono">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-4xl font-bold text-lime-400 flex items-center gap-3">
          🚀 MNQ Order Flow AI Analyst
        </h1>
        <p className="text-zinc-400 mt-1">Versión Web 1.0 – Gemini + Grok</p>

        {/* SETTINGS */}
        <div className="mt-8 bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <h2 className="text-xl font-semibold mb-4">⚙️ Configuración</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Proveedor</label>
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value as 'gemini' | 'grok')}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-white"
              >
                <option value="gemini">Google Gemini</option>
                <option value="grok">xAI Grok</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-zinc-400 mb-1">Modelo</label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-white"
              >
                {(provider === 'gemini' ? geminiModels : grokModels).map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm text-zinc-400 mb-1">API Key</label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-... o AI..."
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-white"
              />
            </div>
          </div>
          <button
            onClick={saveSettings}
            className="mt-4 bg-lime-500 hover:bg-lime-600 text-black font-bold px-6 py-3 rounded-xl transition"
          >
            💾 Guardar configuración
          </button>
        </div>

        {/* UPLOADS */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Order Flow */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <h3 className="font-semibold text-lime-400 mb-3">📸 Order Flow (obligatorio)</h3>
            <input
              type="file"
              accept="image/png"
              onChange={(e) => handleFile(e, true)}
              className="block w-full text-sm text-zinc-400 file:mr-4 file:py-3 file:px-6 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-lime-500 file:text-black hover:file:bg-lime-400"
            />
            {orderFlowBase64 && (
              <img src={`data:image/png;base64,${orderFlowBase64}`} alt="Order Flow" className="mt-4 max-h-80 mx-auto rounded-xl border border-zinc-700" />
            )}
          </div>

          {/* GEXBOT */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <h3 className="font-semibold text-amber-400 mb-3">📸 GEXBOT / Niveles (opcional)</h3>
            <input
              type="file"
              accept="image/png"
              onChange={(e) => handleFile(e, false)}
              className="block w-full text-sm text-zinc-400 file:mr-4 file:py-3 file:px-6 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-amber-500 file:text-black hover:file:bg-amber-400"
            />
            {gexbotBase64 && (
              <img src={`data:image/png;base64,${gexbotBase64}`} alt="GEXBOT" className="mt-4 max-h-80 mx-auto rounded-xl border border-zinc-700" />
            )}
          </div>
        </div>

        {/* ANALYZE BUTTON */}
        <button
          onClick={analyze}
          disabled={loading || !orderFlowBase64}
          className="mt-8 w-full h-20 text-2xl font-bold bg-gradient-to-r from-lime-500 to-green-600 hover:from-lime-400 hover:to-green-500 text-black rounded-3xl flex items-center justify-center gap-4 disabled:opacity-50 transition shadow-2xl"
        >
          {loading ? (
            <>⏳ Analizando con IA...</>
          ) : (
            <>🚀 EJECUTAR ANÁLISIS MNQ</>
          )}
        </button>

        {/* RESULT */}
        {analysis && (
          <div className="mt-10 bg-zinc-900 border border-zinc-700 rounded-3xl p-8 prose prose-invert max-w-none">
            <pre className="whitespace-pre-wrap text-base leading-relaxed font-light">{analysis}</pre>
            <button
              onClick={() => navigator.clipboard.writeText(analysis)}
              className="mt-6 text-xs bg-zinc-800 hover:bg-zinc-700 px-4 py-2 rounded-xl"
            >
              📋 Copiar análisis completo
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
