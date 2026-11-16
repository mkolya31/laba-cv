import Script from 'next/script';

const YandexMetrika = () => (
  <>
    <Script id="yandex-metrika" strategy="afterInteractive">
      {`
        (function () {
          if (window.__yandexMetrika114281247) return;
          window.__yandexMetrika114281247 = true;
          (function(m,e,t,r,i,k,a){
            m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
            m[i].l=1*new Date();
            for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
            k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)
          })(window, document,'script','https://mc.yandex.ru/metrika/tag.js?id=114281247', 'ym');

          ym(114281247, 'init', {ssr:true, webvisor:true, clickmap:true, ecommerce:"dataLayer", referrer: document.referrer, url: location.href, accurateTrackBounce:true, trackLinks:true});
        })();
      `}
    </Script>
    <noscript>
      <div>
        {/* A tracking pixel must remain a native img in the static HTML. */}
        <img
          src="https://mc.yandex.ru/watch/114281247"
          style={{ position: 'absolute', left: '-9999px' }}
          alt=""
        />
      </div>
    </noscript>
  </>
);

export default YandexMetrika;
