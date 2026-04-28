import IMask from 'imask';
import { getPhoneLocalDigits } from '$lib/utils/phone';

type Params = {
  value?: string | null;
  onAccept?: (digits: string) => void;
};

export function phoneMask(node: HTMLInputElement, params: Params = {}) {
  const mask = IMask(node, {
    mask: '000 000 00 00',
    lazy: true
  });

  const setValue = (value?: string | null) => {
    const digits = getPhoneLocalDigits(value);
    if (digits !== mask.unmaskedValue) mask.unmaskedValue = digits;
  };

  mask.on('accept', () => {
    params.onAccept?.(mask.unmaskedValue);
  });

  setValue(params.value);

  return {
    update(next: Params = {}) {
      params = next;
      setValue(params.value);
    },
    destroy() {
      mask.destroy();
    }
  };
}
