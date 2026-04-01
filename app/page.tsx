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
  const [customModel, setCustomModel] = useState('gemini-2.5-flash'); // ← Cambiado por defecto

  const [orderFlowBase64, setOrderFlowBase64] = useState<string>('');
  const [gexbotBase64, setGexbotBase64] = useState<string>('');
  const [analysis, setAnalysis] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const savedKey = localStorage.getItem('of_ai_key');
    const savedProvider = localStorage.getItem('of_ai_provider') as 'gemini' | 'grok';
    const savedModel = localStorage.getItem('of_ai_model');
    if (savedKey) setApiKey(savedKey);
    if (savedProvider) setProvider(savedProvider);
    if (savedModel) setCustomModel(savedModel);
  }, []);

  const saveSettings = () => {
    localStorage.setItem('of_ai_key', apiKey.trim());
    localStorage.setItem('of_ai_provider', provider);
    localStorage.setItem('of_ai_model', customModel);
    alert('✅ Configuración guardada correctamente');
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>, isOrderFlow: boolean) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = (ev.target?.result as string).split(',')[1];
      if (isOrderFlow) setOrderFlowBase64(base64 || '');
      else setGexbotBase64(base64 || '');
    };
    reader.readAsDataURL(file);
  };

  const analyze = async () => {
    if (!apiKey.trim()) return alert('❌ Ingresa tu API Key');
    if (!orderFlowBase64) return alert('❌ Sube al menos la imagen de Order Flow');

    setLoading(true);
    setAnalysis('');

    try {
      let url: string;
      let headers: HeadersInit = { 'Content-Type': 'application/json' };
      let body: any;

      const modelToUse = customModel.trim();

      if (provider === 'gemini') {
        const parts = [
          { text: SYSTEM_PROMPT },
          { inline_data: { mime_type: 'image/png', data: orderFlowBase64 } }
        ];
        if (gexbotBase64) parts.push({ inline_data: { mime_type: 'image/png', data: gexbotBase64 } });

        url = `https://generativelanguage.googleapis.com/v1beta/models/${modelToUse}:generateContent?key=${apiKey.trim()}`;
        body = { contents: [{ parts }] };
      } else {
        // Grok
        const userContent: any[] = [
          { type: 'text', text: 'Analiza estas imágenes siguiendo exactamente las instrucciones del system prompt.' },
          { type: 'image_url', image_url: { url: `data:image/png;base64,${orderFlowBase64}` } }
        ];
        if (gexbotBase64) userContent.push({ type: 'image_url', image_url: { url: `data:image/png;base64,${gexbotBase64}` } });

        url = 'https://api.x.ai/v1/chat/completions';
        headers = { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey.trim()}` 
        };

        body = {
          model: modelToUse || 'grok-2-vision-1212',
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: userContent }
          ],
          max_tokens: 3000,
          temperature: 0.7
        };
      }

      const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Error ${res.status}: ${errText.substring(0, 400)}`);
      }

      const data = await res.json();
      let text = provider === 'gemini' 
        ? data.candidates?.[0]?.content?.parts?.[0]?.text 
        : data.choices?.[0]?.message?.content;

      setAnalysis(text || 'No se recibió respuesta válida del modelo.');
    } catch (err: any) {
      console.error(err);
      setAnalysis(`❌ Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6 font-mono">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-4xl font-bold text-lime-400">🚀 MNQ Order Flow AI Analyst</h1>

        {/* Configuración API Keys */}
        <div className="mt-8 bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <h2 className="text-xl font-semibold mb-4">⚙️ Configuración</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm mb-1">Proveedor</label>
              <select value={provider} onChange={(e) => setProvider(e.target.value as 'gemini' | 'grok')} className="w-full bg-zinc-800 p-3 rounded-lg">
                <option value="gemini">Google Gemini</option>
                <option value="grok">xAI Grok</option>
              </select>
            </div>

            <div>
              <label className="block text-sm mb-1">Modelo (puedes escribir cualquiera)</label>
              <input 
                type="text" 
                value={customModel} 
                onChange={(e) => setCustomModel(e.target.value)}
                placeholder="gemini-2.5-flash o grok-2-vision-1212"
                className="w-full bg-zinc-800 border border-zinc-700 p-3 rounded-lg text-white"
              />
              <p className="text-xs text-zinc-500 mt-1">Ej: gemini-2.5-flash | grok-2-vision-1212</p>
            </div>

            <div>
              <label className="block text-sm mb-1">API Key</label>
              <input 
                type="password" 
                value={apiKey} 
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 p-3 rounded-lg"
              />
            </div>
          </div>

          <button onClick={saveSettings} className="mt-4 bg-lime-500 hover:bg-lime-600 text-black font-bold px-8 py-3 rounded-xl">
            💾 Guardar Configuración
          </button>
        </div>

        {/* Uploads de imágenes */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <h3 className="text-lime-400 font-semibold mb-3">📸 Order Flow (obligatorio)</h3>
            <input type="file" accept="image/png" onChange={(e) => handleFile(e, true)} className="block w-full" />
            {orderFlowBase64 && <img src={`data:image/png;base64,${orderFlowBase64}`} className="mt-4 max-h-72 rounded-xl" />}
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <h3 className="text-amber-400 font-semibold mb-3">📸 GEXBOT (opcional)</h3>
            <input type="file" accept="image/png" onChange={(e) => handleFile(e, false)} className="block w-full" />
            {gexbotBase64 && <img src={`data:image/png;base64,${gexbotBase64}`} className="mt-4 max-h-72 rounded-xl" />}
          </div>
        </div>

        <button 
          onClick={analyze}
          disabled={loading || !orderFlowBase64}
          className="mt-10 w-full h-20 text-2xl font-bold bg-gradient-to-r from-lime-500 to-green-600 rounded-3xl disabled:opacity-50"
        >
          {loading ? '⏳ Analizando...' : '🚀 EJECUTAR ANÁLISIS MNQ'}
        </button>

        {analysis && (
          <div className="mt-10 bg-zinc-900 border border-zinc-700 rounded-3xl p-8 whitespace-pre-wrap text-base">
            {analysis}
          </div>
        )}
      </div>
    </div>
  );
}
