let audioCtx: AudioContext | null = null

// Sequência de toques (segundos, Hz). Duas notas alternadas, repetidas 3 vezes
// (~2s no total) — dá pra ouvir de longe na cozinha.
const TOQUES: { inicio: number; freq: number }[] = [0, 0.7, 1.4].flatMap((base) => [
  { inicio: base, freq: 988 },
  { inicio: base + 0.25, freq: 1319 },
])
const DURACAO = 0.22
const VOLUME = 0.9

/**
 * Beep sintetizado (sem depender de um arquivo de áudio). Precisa ser
 * chamado a partir de um gesto do usuário na primeira vez, por causa das
 * políticas de autoplay do navegador.
 */
export function tocarBeep() {
  try {
    audioCtx ??= new AudioContext()
    if (audioCtx.state === 'suspended') audioCtx.resume()

    const ctx = audioCtx
    const agora = ctx.currentTime

    // Compressor segura os picos para o volume alto não distorcer.
    const compressor = ctx.createDynamicsCompressor()
    compressor.connect(ctx.destination)

    TOQUES.forEach(({ inicio, freq }) => {
      const t = agora + inicio
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      // Onda quadrada soa bem mais alta e "estridente" que a senoidal.
      osc.type = 'square'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0, t)
      gain.gain.linearRampToValueAtTime(VOLUME, t + 0.01)
      gain.gain.setValueAtTime(VOLUME, t + DURACAO - 0.04)
      gain.gain.exponentialRampToValueAtTime(0.001, t + DURACAO)
      osc.connect(gain)
      gain.connect(compressor)
      osc.start(t)
      osc.stop(t + DURACAO + 0.01)
    })
  } catch {
    // navegador sem suporte a Web Audio API — sem alerta sonoro, sem quebrar a página
  }
}
