import type { Directive, DirectiveBinding } from "vue";

const handlers = new WeakMap<HTMLElement, (event: Event) => void>();

const clickOutside: Directive = {
  mounted(el: HTMLElement, binding: DirectiveBinding<() => void>) {
    const handler = (event: Event) => {
      if (!(el === event.target || el.contains(event.target as Node))) {
        binding.value();
      }
    };
    handlers.set(el, handler);
    document.addEventListener("click", handler);
  },
  unmounted(el: HTMLElement) {
    const handler = handlers.get(el);
    if (handler) {
      document.removeEventListener("click", handler);
      handlers.delete(el);
    }
  },
};

export default clickOutside;