// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ExclusionRegistryPanel from '@/components/ExclusionRegistryPanel';
import { COMPONENT_EXCLUSION_REGISTRY } from '@/lib/analyzer/componentExclusionRegistry';

describe('ExclusionRegistryPanel', () => {
  const defaultRegistry = new Set(COMPONENT_EXCLUSION_REGISTRY);

  it('renders the correct class count', () => {
    render(
      <ExclusionRegistryPanel
        registry={defaultRegistry}
        onRegistryChange={vi.fn()}
      />
    );
    expect(screen.getByText(`(${COMPONENT_EXCLUSION_REGISTRY.size} classes)`)).toBeInTheDocument();
  });

  it('starts collapsed and expands on click', () => {
    render(
      <ExclusionRegistryPanel
        registry={defaultRegistry}
        onRegistryChange={vi.fn()}
      />
    );
    // Content should be hidden initially
    expect(screen.queryByPlaceholderText('Filter classes...')).not.toBeInTheDocument();

    // Click to expand
    fireEvent.click(screen.getByText(/Component Exclusion Registry/));

    // Content should now be visible
    expect(screen.getByPlaceholderText('Filter classes...')).toBeInTheDocument();
  });

  it('adding a valid class name calls onRegistryChange', async () => {
    const user = userEvent.setup();
    const onRegistryChange = vi.fn();

    render(
      <ExclusionRegistryPanel
        registry={defaultRegistry}
        onRegistryChange={onRegistryChange}
      />
    );

    // Expand panel
    fireEvent.click(screen.getByText(/Component Exclusion Registry/));

    // Type a new class name
    const addInput = screen.getByPlaceholderText('Add class name...');
    await user.type(addInput, 'newComponent');
    fireEvent.click(screen.getByText('Add'));

    expect(onRegistryChange).toHaveBeenCalledTimes(1);
    const newRegistry = onRegistryChange.mock.calls[0][0] as Set<string>;
    expect(newRegistry.has('newComponent')).toBe(true);
  });

  it('adding a duplicate shows validation error', async () => {
    const user = userEvent.setup();
    render(
      <ExclusionRegistryPanel
        registry={new Set(['existing'])}
        onRegistryChange={vi.fn()}
      />
    );

    fireEvent.click(screen.getByText(/Component Exclusion Registry/));
    const addInput = screen.getByPlaceholderText('Add class name...');
    await user.type(addInput, 'existing');
    fireEvent.click(screen.getByText('Add'));

    expect(screen.getByText('Class already exists in registry.')).toBeInTheDocument();
  });

  it('adding a class with whitespace shows validation error', async () => {
    const user = userEvent.setup();
    render(
      <ExclusionRegistryPanel
        registry={new Set(['test'])}
        onRegistryChange={vi.fn()}
      />
    );

    fireEvent.click(screen.getByText(/Component Exclusion Registry/));
    const addInput = screen.getByPlaceholderText('Add class name...');
    await user.type(addInput, 'has space');
    fireEvent.click(screen.getByText('Add'));

    expect(screen.getByText('Class name must not contain whitespace.')).toBeInTheDocument();
  });

  it('removing a class calls onRegistryChange', () => {
    const onRegistryChange = vi.fn();
    const registry = new Set(['alpha', 'beta', 'gamma']);

    render(
      <ExclusionRegistryPanel
        registry={registry}
        onRegistryChange={onRegistryChange}
      />
    );

    fireEvent.click(screen.getByText(/Component Exclusion Registry/));
    fireEvent.click(screen.getByRole('button', { name: /Remove beta/ }));

    expect(onRegistryChange).toHaveBeenCalledTimes(1);
    const newRegistry = onRegistryChange.mock.calls[0][0] as Set<string>;
    expect(newRegistry.has('beta')).toBe(false);
    expect(newRegistry.has('alpha')).toBe(true);
    expect(newRegistry.has('gamma')).toBe(true);
  });

  it('reset button restores default registry', () => {
    const onRegistryChange = vi.fn();
    const modifiedRegistry = new Set(COMPONENT_EXCLUSION_REGISTRY);
    modifiedRegistry.add('customClass');

    render(
      <ExclusionRegistryPanel
        registry={modifiedRegistry}
        onRegistryChange={onRegistryChange}
      />
    );

    fireEvent.click(screen.getByText(/Component Exclusion Registry/));
    fireEvent.click(screen.getByText('Reset'));

    expect(onRegistryChange).toHaveBeenCalledTimes(1);
    const restoredRegistry = onRegistryChange.mock.calls[0][0] as Set<string>;
    expect(restoredRegistry.size).toBe(COMPONENT_EXCLUSION_REGISTRY.size);
    expect(restoredRegistry.has('customClass')).toBe(false);
  });

  it('search filter narrows the displayed list', async () => {
    const user = userEvent.setup();
    const registry = new Set(['accordion', 'carousel', 'flipCard']);

    render(
      <ExclusionRegistryPanel
        registry={registry}
        onRegistryChange={vi.fn()}
      />
    );

    fireEvent.click(screen.getByText(/Component Exclusion Registry/));

    const filterInput = screen.getByPlaceholderText('Filter classes...');
    await user.type(filterInput, 'acc');

    // Only accordion should be visible
    expect(screen.getByText('accordion')).toBeInTheDocument();
    expect(screen.queryByText('carousel')).not.toBeInTheDocument();
    expect(screen.queryByText('flipCard')).not.toBeInTheDocument();
  });

  it('shows "Modified" indicator when registry differs from default', () => {
    const modifiedRegistry = new Set(COMPONENT_EXCLUSION_REGISTRY);
    modifiedRegistry.add('customClass');

    render(
      <ExclusionRegistryPanel
        registry={modifiedRegistry}
        onRegistryChange={vi.fn()}
      />
    );

    expect(screen.getByText(/Modified/)).toBeInTheDocument();
  });
});
