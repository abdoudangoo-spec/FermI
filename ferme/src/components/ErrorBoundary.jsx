// Filet de sécurité : une erreur de rendu non gérée affiche l'écran d'erreur FermI
// au lieu de fermer l'application.
import { Component } from 'react';
import { ErrorState } from './states';
import { logger } from '../utils/logger';

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    logger.error('[ErrorBoundary]', error);
  }

  reset = () => this.setState({ hasError: false });

  render() {
    if (this.state.hasError) {
      return (
        <ErrorState
          full
          title="Un problème est survenu"
          message="L'écran n'a pas pu s'afficher. Vos données enregistrées sur l'appareil ne sont pas affectées."
          onRetry={this.reset}
          retryLabel="Réessayer"
        />
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
