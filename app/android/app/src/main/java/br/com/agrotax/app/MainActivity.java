package br.com.agrotax.app;

import android.app.AlertDialog;
import android.os.Bundle;
import android.util.Log;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.WebViewListener;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import org.json.JSONObject;

public class MainActivity extends BridgeActivity {
    private static final String TAG = "AgroTax";
    private boolean exibindoErro = false;

    /**
     * Registra a camada de adaptação antes da criação da bridge, para que o CSS/JS
     * nativo seja aplicado em todas as páginas carregadas (inclusive admin.html).
     */
    @Override
    protected void load() {
        bridgeBuilder.addWebViewListener(new WebViewListener() {
            @Override
            public void onPageLoaded(WebView webView) {
                aplicarAdaptacao(webView);
            }

            @Override
            public void onReceivedError(WebView webView) {
                avisarSemConexao(webView);
            }
        });
        super.load();
    }

    private void aplicarAdaptacao(WebView webView) {
        try {
            final String css = lerAsset("public/mobile/adapter.css");
            final String js = lerAsset("public/mobile/adapter.js");
            final String script =
                "(function(){"
                + "try{if(!window.__agrotaxCss){window.__agrotaxCss=new CSSStyleSheet();"
                + "window.__agrotaxCss.replaceSync(" + JSONObject.quote(css) + ");"
                + "document.adoptedStyleSheets=Array.prototype.concat.call([],document.adoptedStyleSheets||[],[window.__agrotaxCss]);}"
                + "}catch(e){console.warn('AgroTax CSS',e);}"
                + js
                + "})();";
            webView.evaluateJavascript(script, null);
        } catch (Exception erro) {
            Log.e(TAG, "Falha ao aplicar a adaptação mobile", erro);
        }
    }

    private String lerAsset(String caminho) throws Exception {
        InputStream entrada = getAssets().open(caminho);
        ByteArrayOutputStream saida = new ByteArrayOutputStream();
        byte[] buffer = new byte[4096];
        int lidos;
        while ((lidos = entrada.read(buffer)) != -1) saida.write(buffer, 0, lidos);
        entrada.close();
        return new String(saida.toByteArray(), StandardCharsets.UTF_8);
    }

    private void avisarSemConexao(final WebView webView) {
        if (exibindoErro || isFinishing() || isDestroyed()) return;
        exibindoErro = true;
        new AlertDialog.Builder(this)
            .setTitle("AGROTAX sem conexão")
            .setMessage("Não foi possível acessar o servidor do AgroTax. Verifique sua internet e tente novamente.")
            .setCancelable(false)
            .setPositiveButton("Tentar novamente", (dialog, qual) -> {
                exibindoErro = false;
                webView.reload();
            })
            .setNegativeButton("Fechar", (dialog, qual) -> {
                exibindoErro = false;
                finish();
            })
            .show();
    }

    /** Volta entre seções/páginas antes de sair do aplicativo. */
    @Override
    public void onBackPressed() {
        WebView webView = bridge != null ? bridge.getWebView() : null;
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
            return;
        }
        super.onBackPressed();
    }
}
