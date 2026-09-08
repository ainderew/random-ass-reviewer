import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { initialIslandState, useIslandStore } from '@/game/store/island-store';
import { BuildPalette } from './build-palette';

describe('BuildPalette', () => {
  beforeEach(() => {
    useIslandStore.setState({ ...initialIslandState, mode: 'build' });
  });

  const renderPalette = (focus: number) =>
    render(
      <BuildPalette
        balances={{ focus, insight: 0 }}
        level={9}
        ownedAssetIds={[]}
        freeCredits={{}}
        onPlaceArmed={() => {}}
        onRemoveSelected={() => {}}
        busy={false}
      />,
    );

  it('dims what the user cannot afford and keeps the price visible', () => {
    renderPalette(100);

    expect(screen.getByRole('button', { name: /Grass tuft/ })).toBeEnabled();
    const lantern = screen.getByRole('button', { name: /Lantern post/ });
    expect(lantern).toBeDisabled();
    expect(lantern).toHaveTextContent('120');
  });

  it('selecting an item sets it in the store and shows Rotate', async () => {
    renderPalette(1000);

    await userEvent.click(screen.getByRole('button', { name: /Lantern post/ }));

    expect(useIslandStore.getState().selectedAssetId).toBe('lantern_brass');
    expect(screen.getByRole('button', { name: 'Rotate' })).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Place here' }),
    ).not.toBeInTheDocument();
  });

  it('offers Place here once a tile is armed by touch', () => {
    useIslandStore.setState({
      selectedAssetId: 'grass_tuft',
      armedTile: { x: 0, z: 0 },
    });
    renderPalette(1000);

    expect(
      screen.getByRole('button', { name: 'Place here' }),
    ).toBeInTheDocument();
  });

  it('renders nothing outside build mode', () => {
    useIslandStore.setState({ mode: 'view' });
    renderPalette(1000);

    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
  });
});
