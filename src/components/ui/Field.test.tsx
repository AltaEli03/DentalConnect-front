import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Field } from './Field';

describe('Field', () => {
  it('associates the label, hint and error with the control', () => {
    render(
      <Field id="email" label="Correo" hint="Usa tu correo principal" error="Requerido">
        <input />
      </Field>,
    );

    const input = screen.getByLabelText('Correo');
    expect(input).toHaveAttribute('id', 'email');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAttribute('aria-describedby', 'email-hint email-error');
    expect(screen.getByText('Usa tu correo principal')).toHaveAttribute('id', 'email-hint');
    expect(screen.getByText('Requerido')).toHaveAttribute('id', 'email-error');
  });
});
