import { Component, type ReactNode } from 'react';

interface Props {
  assetId: string;
  children: ReactNode;
}

interface State {
  failed: boolean;
}

// One bad GLB blanks its own group, never the island.
export class AssetErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: unknown): void {
    console.error(
      `[island] asset "${this.props.assetId}" failed to load`,
      error,
    );
  }

  render(): ReactNode {
    return this.state.failed ? null : this.props.children;
  }
}
