import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Monkeypatch Node.prototype.removeChild et insertBefore pour éviter les plantages de React
// causés par l'injection de scripts tiers (Vercel Toolbar, Google Translate, extensions de mot de passe, etc.)
if (typeof window !== 'undefined') {
  const originalRemoveChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function <T extends Node>(child: T): T {
    if (child.parentNode !== this) {
      console.warn('removeChild: parentNode mismatch, ignoring to prevent React crash', { parent: this, child });
      return child;
    }
    return originalRemoveChild.call(this, child) as T;
  };

  const originalInsertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function <T extends Node>(newNode: T, referenceNode: Node | null): T {
    if (referenceNode && referenceNode.parentNode !== this) {
      console.warn('insertBefore: referenceNode parentNode mismatch, ignoring to prevent React crash', { parent: this, referenceNode });
      return newNode;
    }
    return originalInsertBefore.call(this, newNode, referenceNode) as T;
  };
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

