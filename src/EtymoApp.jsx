import React, { useState } from 'react';
import { Search, BookOpen, Loader2, Copy, Volume2, ChevronDown, ChevronUp, Clock, Network } from 'lucide-react';

const SpanishEtymologyAnalyzer = () => {
  const [word, setWord] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [recentSearches, setRecentSearches] = useState(['biblioteca', 'ventana', 'corazón']);
  const [expandedSections, setExpandedSections] = useState({
    etymology: true,
    related: true,
    mnemonic: true,
    sentences: true
  });
  const [copied, setCopied] = useState(false);
  const [availableVoices, setAvailableVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState(null);
  const [showVoiceSelector, setShowVoiceSelector] = useState(false);

  // Load available voices
  React.useEffect(() => {
    const loadVoices = () => {
      const voices = speechSynthesis.getVoices();
      const spanishVoices = voices.filter(voice => 
        voice.lang.startsWith('es') || voice.name.toLowerCase().includes('spanish')
      );
      setAvailableVoices(spanishVoices);
      
      // Try to find and set Chrome OS Spanish (US) Voice 3 as default
      const preferredVoice = spanishVoices.find(voice => 
        voice.lang === 'es-US' && voice.name.toLowerCase().includes('google')
      ) || spanishVoices.find(voice => 
        voice.lang === 'es-US'
      ) || spanishVoices[0];
      
      if (preferredVoice) {
        setSelectedVoice(preferredVoice);
      }
    };

    loadVoices();
    speechSynthesis.onvoiceschanged = loadVoices;
  }, []);

  const analyzeWord = async () => {
    if (!word.trim()) {
      setError('Please enter a Spanish word');
      return;
    }

    setLoading(true);
    setError('');
    setAnalysis(null);

    try {
      const prompt = `You are a Spanish etymology and memory expert. When I give you a single Spanish word, return a detailed breakdown with the following format:
1. **📘 Word**: [Spanish word]
2. **English meaning**:
3. **🧬 Latin (or other) root**: Where the word comes from, traced to Classical Latin or other sources, with clear explanation of historical evolution (e.g. Old Spanish, Vulgar Latin, Arabic, etc.)
4. **🌿 Related English words**: Derived from the same root
5. **🧠 Mnemonic device**: A personalized, vivid, etymology-based strategy to help an English speaker remember the meaning of the word
6. **✍️ Sample sentences**: 2–3 short example sentences using the word in Spanish, each with an English translation

Format each section clearly using headings and bullet points. Keep the tone insightful, educational, and slightly poetic if appropriate — but always clear and accurate.

Spanish word to analyze: "${word.trim()}"

Respond with a JSON object in this exact format:
{
  "word": "the Spanish word",
  "englishMeaning": "the English meaning",
  "etymology": "detailed etymology explanation",
  "relatedEnglishWords": ["word1", "word2", "word3"],
  "mnemonic": "the mnemonic device explanation",
  "sampleSentences": [
    {"spanish": "Spanish sentence 1", "english": "English translation 1"},
    {"spanish": "Spanish sentence 2", "english": "English translation 2"},
    {"spanish": "Spanish sentence 3", "english": "English translation 3"}
  ],
  "confidence": "high",
  "languageFamily": "Indo-European > Italic > Romance > Ibero-Romance",
  "pronunciation": "phonetic pronunciation guide"
}

Your entire response MUST be a single, valid JSON object. DO NOT include any text outside of the JSON structure, including backticks or markdown formatting.`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.REACT_APP_OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [{ 
            role: 'user', 
            content: prompt 
          }],
          temperature: 0.7,
          max_tokens: 2000
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const aiResponse = data.choices[0].message.content;
      
      // Clean up response in case GPT-4o includes markdown formatting
      const cleanedResponse = aiResponse.replace(/```json\s*|\s*```/g, '').trim();
      const parsedAnalysis = JSON.parse(cleanedResponse);
      
      // Ensure arrays exist with fallback values
      const safeAnalysis = {
        ...parsedAnalysis,
        relatedEnglishWords: parsedAnalysis.relatedEnglishWords || [],
        sampleSentences: parsedAnalysis.sampleSentences || [],
        confidence: parsedAnalysis.confidence || 'medium',
        languageFamily: parsedAnalysis.languageFamily || 'Romance',
        pronunciation: parsedAnalysis.pronunciation || word.trim()
      };
      
      setAnalysis(safeAnalysis);
      
      // Add to recent searches
      const newSearches = [word.trim(), ...recentSearches.filter(s => s !== word.trim())].slice(0, 5);
      setRecentSearches(newSearches);
      
    } catch (err) {
      console.error('Error analyzing word:', err);
      if (err.message.includes('OpenAI API error')) {
        setError(`API Error: ${err.message}. Please check your OpenAI API key.`);
      } else if (err.name === 'SyntaxError') {
        setError('Failed to parse analysis. Please try again.');
      } else {
        setError('Failed to analyze the word. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = () => {
    analyzeWord();
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const copyAnalysis = async () => {
    if (!analysis) return;
    
    const textToCopy = `📘 ${analysis.word} - ${analysis.englishMeaning}

🧬 Etymology: ${analysis.etymology}

🌿 Related English Words: ${analysis.relatedEnglishWords.join(', ')}

🧠 Mnemonic: ${analysis.mnemonic}

✍️ Sample Sentences:
${analysis.sampleSentences.map(s => `• ${s.spanish} - ${s.english}`).join('\n')}`;

    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const speakWord = () => {
    if (analysis && 'speechSynthesis' in window && selectedVoice) {
      const utterance = new SpeechSynthesisUtterance(analysis.word);
      utterance.voice = selectedVoice;
      utterance.rate = 0.8; // Slightly slower for learning
      utterance.pitch = 1.0;
      speechSynthesis.speak(utterance);
    }
  };

  const ConfidenceIndicator = ({ level }) => {
    const colors = {
      high: 'bg-emerald-500',
      medium: 'bg-amber-500',
      low: 'bg-red-500'
    };
    
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-amber-700">Confidence:</span>
        <div className={`w-2 h-2 rounded-full ${colors[level] || colors.medium}`}></div>
        <span className="text-xs text-amber-600 capitalize">{level}</span>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 p-4 relative overflow-hidden">
      {/* Subtle paper texture overlay */}
      <div className="absolute inset-0 opacity-30 bg-gradient-to-br from-amber-100/20 to-orange-100/20 pointer-events-none"></div>
      
      <div className="max-w-6xl mx-auto relative z-10">
        {/* Ornamental border */}
        <div className="border-2 border-amber-200/60 rounded-3xl bg-white/80 backdrop-blur-sm shadow-2xl shadow-amber-900/10 p-8 mb-8">
          
          {/* Header */}
          <div className="text-center mb-10">
            <div className="flex items-center justify-center gap-4 mb-6">
              <div className="p-3 bg-amber-600/10 rounded-full">
                <BookOpen className="w-10 h-10 text-amber-700" />
              </div>
              <h1 className="text-5xl font-bold text-amber-900 tracking-tight" style={{fontFamily: 'Georgia, serif'}}>
                Etymo
              </h1>
            </div>
            <p className="text-amber-600 text-sm font-semibold tracking-wide mb-3 uppercase">
              by SpanishPro PowerTools
            </p>
            <p className="text-amber-800 text-xl font-medium mb-2" style={{fontFamily: 'Georgia, serif'}}>
              AI-Powered Etymology Analyzer & Mnemonics Engine
            </p>
            <p className="text-amber-700 text-base leading-relaxed max-w-2xl mx-auto">
              Explore word origins, create memory aids, and understand linguistic connections. 
              Perfect for deep vocabulary analysis and building lasting memory associations.
            </p>
          </div>

          <div className="grid lg:grid-cols-4 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-3 space-y-8">
              
              {/* Search Interface */}
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl shadow-lg border border-amber-200/50 p-6">
                <div className="space-y-4">
                  <div className="relative">
                    <input
                      type="text"
                      value={word}
                      onChange={(e) => setWord(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
                      placeholder="Enter a Spanish word (e.g., biblioteca, ventana, corazón)..."
                      className="w-full px-6 py-4 pl-14 border-2 border-amber-300/50 rounded-xl focus:border-amber-500 focus:outline-none text-lg bg-white/90 backdrop-blur-sm shadow-inner"
                      disabled={loading}
                      style={{fontFamily: 'Georgia, serif'}}
                    />
                    <Search className="absolute left-5 top-1/2 transform -translate-y-1/2 w-6 h-6 text-amber-500" />
                  </div>
                  
                  <button
                    onClick={handleSubmit}
                    disabled={loading || !word.trim()}
                    className="w-full bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 disabled:from-amber-300 disabled:to-amber-400 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-300 flex items-center justify-center gap-3 shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-6 h-6 animate-spin" />
                        Analyzing Etymology...
                      </>
                    ) : (
                      <>
                        <BookOpen className="w-5 h-5" />
                        Analyze Etymology
                      </>
                    )}
                  </button>
                </div>

                {error && (
                  <div className="mt-6 p-4 bg-red-50 border-2 border-red-200 rounded-xl text-red-700 shadow-inner">
                    {error}
                  </div>
                )}
              </div>

              {/* Analysis Results */}
              {analysis && (
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-2xl border-2 border-amber-200/60 overflow-hidden animate-fade-in">
                  {/* Word Header */}
                  <div className="bg-gradient-to-r from-amber-600 to-amber-700 text-white p-8 relative overflow-hidden">
                    <div className="absolute inset-0 bg-black/10"></div>
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-4xl font-bold flex items-center gap-4" style={{fontFamily: 'Georgia, serif'}}>
                          📘 {analysis.word}
                          <div className="flex items-center gap-2">
                            <button
                              onClick={speakWord}
                              disabled={!selectedVoice}
                              className="p-2 bg-white/20 hover:bg-white/30 disabled:bg-white/10 disabled:opacity-50 rounded-full transition-colors"
                              title={selectedVoice ? `Pronounce word (${selectedVoice.name})` : 'No voice selected'}
                            >
                              <Volume2 className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => setShowVoiceSelector(!showVoiceSelector)}
                              className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors text-xs"
                              title="Select voice"
                            >
                              🎤
                            </button>
                          </div>
                        </h2>
                        <button
                          onClick={copyAnalysis}
                          className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                        >
                          <Copy className="w-4 h-4" />
                          {copied ? 'Copied!' : 'Copy'}
                        </button>
                      </div>
                      <p className="text-amber-100 text-xl mb-3">{analysis.englishMeaning}</p>
                      <div className="flex items-center gap-6 text-sm">
                        <span className="text-amber-200">📞 {analysis.pronunciation}</span>
                        <span className="text-amber-200">🌍 {analysis.languageFamily}</span>
                        <ConfidenceIndicator level={analysis.confidence} />
                        {selectedVoice && (
                          <span className="text-amber-200">🎤 {selectedVoice.name}</span>
                        )}
                      </div>
                      
                      {/* Voice Selector */}
                      {showVoiceSelector && (
                        <div className="mt-4 p-4 bg-white/20 rounded-lg backdrop-blur-sm">
                          <h4 className="text-white font-semibold mb-3">Select Spanish Voice:</h4>
                          <div className="grid grid-cols-1 gap-2 max-h-32 overflow-y-auto">
                            {availableVoices.map((voice, index) => (
                              <button
                                key={index}
                                onClick={() => {
                                  setSelectedVoice(voice);
                                  setShowVoiceSelector(false);
                                }}
                                className={`text-left p-2 rounded text-sm transition-colors ${
                                  selectedVoice?.name === voice.name 
                                    ? 'bg-white/30 text-white font-semibold' 
                                    : 'bg-white/10 text-amber-100 hover:bg-white/20'
                                }`}
                              >
                                <div>{voice.name}</div>
                                <div className="text-xs opacity-75">{voice.lang} • {voice.localService ? 'Local' : 'Remote'}</div>
                              </button>
                            ))}
                          </div>
                          {availableVoices.length === 0 && (
                            <p className="text-amber-200 text-sm italic">No Spanish voices found on this system.</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="p-8 space-y-8">
                    {/* Etymology */}
                    <section className="border border-amber-200 rounded-xl p-6 bg-gradient-to-br from-amber-50 to-orange-50">
                      <button
                        onClick={() => toggleSection('etymology')}
                        className="w-full flex items-center justify-between mb-4 text-left"
                      >
                        <h3 className="text-2xl font-semibold text-amber-800 flex items-center gap-3" style={{fontFamily: 'Georgia, serif'}}>
                          🧬 Etymology & Historical Evolution
                        </h3>
                        {expandedSections.etymology ? 
                          <ChevronUp className="w-6 h-6 text-amber-600" /> : 
                          <ChevronDown className="w-6 h-6 text-amber-600" />
                        }
                      </button>
                      {expandedSections.etymology && (
                        <div className="bg-white/80 p-6 rounded-lg border-l-4 border-amber-500 shadow-inner animate-fade-in">
                          <p className="text-gray-700 leading-relaxed text-lg" style={{fontFamily: 'Georgia, serif'}}>
                            {analysis.etymology}
                          </p>
                        </div>
                      )}
                    </section>

                    {/* Related English Words */}
                    <section className="border border-green-200 rounded-xl p-6 bg-gradient-to-br from-green-50 to-emerald-50">
                      <button
                        onClick={() => toggleSection('related')}
                        className="w-full flex items-center justify-between mb-4 text-left"
                      >
                        <h3 className="text-2xl font-semibold text-green-800 flex items-center gap-3" style={{fontFamily: 'Georgia, serif'}}>
                          🌿 Related English Words
                          <Network className="w-5 h-5" />
                        </h3>
                        {expandedSections.related ? 
                          <ChevronUp className="w-6 h-6 text-green-600" /> : 
                          <ChevronDown className="w-6 h-6 text-green-600" />
                        }
                      </button>
                      {expandedSections.related && (
                        <div className="flex flex-wrap gap-3 animate-fade-in">
                          {(analysis.relatedEnglishWords || []).map((relatedWord, index) => (
                            <span
                              key={index}
                              className="bg-green-100 hover:bg-green-200 text-green-800 px-5 py-3 rounded-full font-medium border-2 border-green-200 hover:border-green-300 transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md transform hover:scale-105"
                              style={{fontFamily: 'Georgia, serif'}}
                            >
                              {relatedWord}
                            </span>
                          ))}
                        </div>
                      )}
                    </section>

                    {/* Mnemonic Device */}
                    <section className="border border-blue-200 rounded-xl p-6 bg-gradient-to-br from-blue-50 to-indigo-50">
                      <button
                        onClick={() => toggleSection('mnemonic')}
                        className="w-full flex items-center justify-between mb-4 text-left"
                      >
                        <h3 className="text-2xl font-semibold text-blue-800 flex items-center gap-3" style={{fontFamily: 'Georgia, serif'}}>
                          🧠 Memory Device
                        </h3>
                        {expandedSections.mnemonic ? 
                          <ChevronUp className="w-6 h-6 text-blue-600" /> : 
                          <ChevronDown className="w-6 h-6 text-blue-600" />
                        }
                      </button>
                      {expandedSections.mnemonic && (
                        <div className="bg-white/80 p-6 rounded-lg border-l-4 border-blue-500 shadow-inner animate-fade-in">
                          <p className="text-gray-700 leading-relaxed text-lg italic" style={{fontFamily: 'Georgia, serif'}}>
                            {analysis.mnemonic}
                          </p>
                        </div>
                      )}
                    </section>

                    {/* Sample Sentences */}
                    <section className="border border-purple-200 rounded-xl p-6 bg-gradient-to-br from-purple-50 to-violet-50">
                      <button
                        onClick={() => toggleSection('sentences')}
                        className="w-full flex items-center justify-between mb-4 text-left"
                      >
                        <h3 className="text-2xl font-semibold text-purple-800 flex items-center gap-3" style={{fontFamily: 'Georgia, serif'}}>
                          ✍️ Sample Sentences
                        </h3>
                        {expandedSections.sentences ? 
                          <ChevronUp className="w-6 h-6 text-purple-600" /> : 
                          <ChevronDown className="w-6 h-6 text-purple-600" />
                        }
                      </button>
                      {expandedSections.sentences && (
                        <div className="space-y-4 animate-fade-in">
                          {(analysis.sampleSentences || []).map((sentence, index) => (
                            <div key={index} className="bg-white/80 p-5 rounded-lg border border-purple-200 shadow-sm hover:shadow-md transition-shadow">
                              <p className="text-gray-800 font-medium mb-3 text-lg" style={{fontFamily: 'Georgia, serif'}}>
                                <span className="text-purple-600 font-bold">ES:</span> {sentence.spanish || 'N/A'}
                              </p>
                              <p className="text-gray-600 text-lg" style={{fontFamily: 'Georgia, serif'}}>
                                <span className="text-blue-600 font-bold">EN:</span> {sentence.english || 'N/A'}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </section>
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-amber-200/50 p-6 sticky top-4">
                <h3 className="text-xl font-semibold text-amber-800 mb-4 flex items-center gap-2" style={{fontFamily: 'Georgia, serif'}}>
                  <Clock className="w-5 h-5" />
                  Recent Searches
                </h3>
                <div className="space-y-2">
                  {recentSearches.map((search, index) => (
                    <button
                      key={index}
                      onClick={() => {setWord(search); analyzeWord();}}
                      className="w-full text-left px-4 py-3 bg-amber-50 hover:bg-amber-100 rounded-lg border border-amber-200 hover:border-amber-300 transition-all duration-200 text-amber-800 font-medium"
                      style={{fontFamily: 'Georgia, serif'}}
                    >
                      {search}
                    </button>
                  ))}
                </div>
                
                <div className="mt-8 p-4 bg-gradient-to-br from-amber-100 to-orange-100 rounded-lg border border-amber-200">
                  <h4 className="font-semibold text-amber-800 mb-2" style={{fontFamily: 'Georgia, serif'}}>
                    💡 Pro Tip
                  </h4>
                  <p className="text-sm text-amber-700 leading-relaxed">
                    Try analyzing compound words like "sacacorchos" or words with Arabic origins like "almohada" for fascinating etymological journeys!
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-amber-700 bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-amber-200/50">
          <p className="text-sm italic" style={{fontFamily: 'Georgia, serif'}}>
            Uncover the rich linguistic heritage connecting Spanish to Latin, Arabic, Germanic, and Celtic languages
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.5s ease-out;
        }
      `}</style>
    </div>
  );
};

export default SpanishEtymologyAnalyzer;
