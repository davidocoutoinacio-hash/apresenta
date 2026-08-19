import { Component } from "react";

// Sem isso, qualquer erro não tratado dentro da cena 3D derruba a árvore inteira
// do React a partir daqui pra baixo — a interface (inclusive botões fora do
// canvas, se o boundary ficasse lá em cima) simplesmente some, sobrando só o
// fundo escuro da página. Voz/áudio continuam tocando porque não fazem parte
// da árvore do React (são elementos de áudio/DOM já criados antes do erro),
// o que dá a impressão de "tela preta, mas ela responde normal". Colocando o
// boundary só ao redor da cena, um crash aí derruba apenas o avatar — o resto
// da interface (barra superior, roteiros, botão de perguntar) continua vivo.
export default class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("[ErrorBoundary] erro não tratado na cena 3D:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="scene-error-fallback">
          <p>O avatar travou por um instante.</p>
          <button type="button" onClick={() => window.location.reload()}>
            Recarregar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
