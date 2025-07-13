import React, { useEffect, useRef } from 'react';

interface IframeWithHighlightProps {
  url: string;
  selectedSelector: string | null;
  iframeId: string;
}

const IframeWithHighlight: React.FC<IframeWithHighlightProps> = ({ url, selectedSelector, iframeId }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Inject highlight script after iframe loads
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const injectScript = () => {
      try {
        if (!iframe.contentDocument) return;
        const script = iframe.contentDocument.createElement('script');
        if (!script) return;
        script.type = 'text/javascript';
        script.innerHTML = `
          window.addEventListener('message', (event) => {
            if (event.data && event.data.type === 'highlight') {
              document.querySelectorAll('.__highlighted').forEach(el => el.classList.remove('__highlighted'));
              if (event.data.selector) {
                const el = document.querySelector(event.data.selector);
                if (el) el.classList.add('__highlighted');
              }
            }
          });
          if (!document.getElementById('__highlighted_style')) {
            const style = document.createElement('style');
            style.id = '__highlighted_style';
            style.innerHTML = '.__highlighted { outline: 3px solid #f00 !important; background: rgba(255,0,0,0.1) !important; transition: outline 0.2s; }';
            document.head.appendChild(style);
          }
        `;
        iframe.contentDocument.head.appendChild(script);
      } catch (e) {
        // Cross-origin, cannot inject
      }
    };
    iframe.addEventListener('load', injectScript);
    // If already loaded
    if (iframe.contentDocument && iframe.contentDocument.readyState === 'complete') injectScript();
    return () => {
      iframe.removeEventListener('load', injectScript);
    };
  }, [url]);

  // Send highlight message when selector changes
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    try {
      iframe.contentWindow?.postMessage({ type: 'highlight', selector: selectedSelector }, '*');
    } catch (e) {
      // Cross-origin, ignore
    }
  }, [selectedSelector]);

  return (
    <iframe
      ref={iframeRef}
      id={iframeId}
      src={url}
      title={iframeId}
      className="w-[800px] h-[600px] bg-white border rounded shadow"
      style={{ background: '#f9fafb' }}
    />
  );
};

export default IframeWithHighlight; 