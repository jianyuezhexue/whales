package app

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"strings"
)

// FetchMcpMarket proxies the MCP marketplace API from ModelScope.
// If the API is protected by WAF, it returns a wrapper JSON with the WAF
// challenge HTML so the frontend can solve it in a browser context.
func (a *App) FetchMcpMarket(pageSize int, pageNumber int, query string) (string, error) {
	body := map[string]interface{}{
		"PageSize":   pageSize,
		"PageNumber": pageNumber,
		"Query":      query,
		"Criterion":  []string{},
	}
	return mcpRequest("PUT", "https://www.modelscope.cn/api/v1/dolphin/mcpServers", body, "", "")
}

// FetchMcpMarketWithCookies retries the MCP API request with WAF challenge cookies.
func (a *App) FetchMcpMarketWithCookies(pageSize int, pageNumber int, query string, acwTc string, acwScV2 string) (string, error) {
	body := map[string]interface{}{
		"PageSize":   pageSize,
		"PageNumber": pageNumber,
		"Query":      query,
		"Criterion":  []string{},
	}
	return mcpRequest("PUT", "https://www.modelscope.cn/api/v1/dolphin/mcpServers", body, acwTc, acwScV2)
}

// FetchSkillsMarket proxies the skills marketplace API from ModelScope.
func (a *App) FetchSkillsMarket(pageSize int, pageNumber int, query string) (string, error) {
	body := map[string]interface{}{
		"PageSize":         pageSize,
		"PageNumber":       pageNumber,
		"Query":            query,
		"Sort":             "Default",
		"Criterion":        []string{},
		"WithTopCollection": query == "",
	}
	return modelscopeRequest("PUT", "https://www.modelscope.cn/api/v1/dolphin/skills", body)
}

// FetchSkillCollectionInfo fetches detail info for a skill collection.
func (a *App) FetchSkillCollectionInfo(fid string) (string, error) {
	url := fmt.Sprintf("https://www.modelscope.cn/api/v1/collections/info?Fid=%s", fid)
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return "", fmt.Errorf("create request: %w", err)
	}
	req.Header.Set("Accept", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("read response: %w", err)
	}

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return "", fmt.Errorf("HTTP %d: %s", resp.StatusCode, string(respBody))
	}

	return string(respBody), nil
}

// FetchSkillReadme fetches the README/description content for a skill.
func (a *App) FetchSkillReadme(owner string, name string) (string, error) {
	body := map[string]interface{}{
		"type":           "skill",
		"owner":          owner,
		"name":           name,
		"preferLanguage": "zh_CN",
	}
	return modelscopeRequest("POST", "https://www.modelscope.cn/api/v1/rm/fc?Type=translate-readme", body)
}

// FetchSkillFiles fetches the repo file tree for a skill.
func (a *App) FetchSkillFiles(owner string, name string, revision string, root string) (string, error) {
	u := fmt.Sprintf("https://www.modelscope.cn/api/v1/skills/%s/%s/repo/files?Revision=%s&Root=%s",
		urlPathEscape(owner), urlPathEscape(name), revision, root)
	req, err := http.NewRequest("GET", u, nil)
	if err != nil {
		return "", fmt.Errorf("create request: %w", err)
	}
	req.Header.Set("Accept", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("read response: %w", err)
	}

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return "", fmt.Errorf("HTTP %d: %s", resp.StatusCode, string(respBody))
	}

	return string(respBody), nil
}

// FetchSkillFileContent fetches the raw content of a file in a skill's repo.
func (a *App) FetchSkillFileContent(owner string, name string, revision string, filePath string) (string, error) {
	u := fmt.Sprintf("https://www.modelscope.cn/api/v1/skills/%s/%s/repo/raw?Revision=%s&FilePath=%s&Needmeta=true",
		urlPathEscape(owner), urlPathEscape(name), revision, url.QueryEscape(filePath))
	req, err := http.NewRequest("GET", u, nil)
	if err != nil {
		return "", fmt.Errorf("create request: %w", err)
	}
	req.Header.Set("Accept", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("read response: %w", err)
	}

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return "", fmt.Errorf("HTTP %d: %s", resp.StatusCode, string(respBody))
	}

	return string(respBody), nil
}

func urlPathEscape(s string) string {
	return url.PathEscape(s)
}

func modelscopeRequest(method, urlStr string, body map[string]interface{}) (string, error) {
	return doModelscopeRequest(http.DefaultClient, method, urlStr, body)
}

func doModelscopeRequest(client *http.Client, method, urlStr string, body map[string]interface{}) (string, error) {
	jsonBody, err := json.Marshal(body)
	if err != nil {
		return "", fmt.Errorf("marshal body: %w", err)
	}

	req, err := http.NewRequest(method, urlStr, bytes.NewReader(jsonBody))
	if err != nil {
		return "", fmt.Errorf("create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("read response: %w", err)
	}

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return "", fmt.Errorf("HTTP %d: %s", resp.StatusCode, string(respBody))
	}

	return string(respBody), nil
}

// ── MCP WAF challenge handling ────────────────────────────────────────

// mcpRequest makes a request to the MCP API.
// If cookies are provided, they are included in the request.
// If no cookies are provided and the response is a WAF challenge, a wrapper
// JSON is returned with the HTML needed to solve the challenge.
func mcpRequest(method, urlStr string, body map[string]interface{}, acwTc, acwScV2 string) (string, error) {
	jsonBody, err := json.Marshal(body)
	if err != nil {
		return "", fmt.Errorf("marshal body: %w", err)
	}

	req, err := http.NewRequest(method, urlStr, bytes.NewReader(jsonBody))
	if err != nil {
		return "", fmt.Errorf("create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	if acwTc != "" && acwScV2 != "" {
		req.Header.Set("Cookie", fmt.Sprintf("acw_tc=%s; acw_sc__v2=%s", acwTc, acwScV2))
	}

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("read response: %w", err)
	}

	log.Printf("[mcpRequest] HasCookies=%v Status=%d ContentType=%s BodyLen=%d",
		acwTc != "" && acwScV2 != "", resp.StatusCode, resp.Header.Get("Content-Type"), len(respBody))

	// If cookies were provided, expect the real API response
	if acwTc != "" && acwScV2 != "" {
		if resp.StatusCode < 200 || resp.StatusCode >= 300 {
			return "", fmt.Errorf("HTTP %d: %s", resp.StatusCode, string(respBody))
		}
		// If the retry still returns WAF HTML, the cookies were rejected
		if isWafChallenge(respBody) {
			log.Printf("[mcpRequest] WAF cookies rejected — got another challenge")
			return "", fmt.Errorf("WAF cookies rejected, got another challenge")
		}
		log.Printf("[mcpRequest] Retry with cookies returned real data")
		return string(respBody), nil
	}

	// Without cookies, check for WAF challenge
	if isWafChallenge(respBody) {
		extractedTc := extractSetCookie(resp.Header, "acw_tc")
		if extractedTc == "" {
			return "", fmt.Errorf("WAF challenge detected but no acw_tc cookie received")
		}
		log.Printf("[mcpRequest] WAF challenge detected, acw_tc=%s, building wrapper...", extractedTc[:20]+"...")
		return buildWafWrapper(string(respBody), extractedTc)
	}

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return "", fmt.Errorf("HTTP %d: %s", resp.StatusCode, string(respBody))
	}

	// No WAF — unexpected, but return as-is
	log.Printf("[mcpRequest] No WAF detected, returning raw response")
	return string(respBody), nil
}

func isWafChallenge(body []byte) bool {
	return bytes.Contains(body, []byte("aliyun_waf"))
}

func extractSetCookie(header http.Header, name string) string {
	for _, cookie := range header["Set-Cookie"] {
		if strings.HasPrefix(cookie, name+"=") {
			val := cookie[len(name)+1:]
			if idx := strings.IndexByte(val, ';'); idx >= 0 {
				return val[:idx]
			}
			return val
		}
	}
	return ""
}

// buildWafWrapper takes the WAF challenge HTML, injects a postMessage
// intercept into the reload function, and returns a JSON wrapper that the
// frontend knows how to handle.
func buildWafWrapper(html string, acwTc string) (string, error) {
	// Inject after the first </script> tag (which defines reload) but before
	// the xXRQBR script that calls reload(value). The injected script executes
	// synchronously so reload is replaced before xXRQBR calls it.
	// Without DOMContentLoaded (which would fire too late, after all scripts).
	const interceptScript = `<script>var _orig=reload;reload=function(e){parent.postMessage({type:'waf-cookie',acw_sc__v2:String(e)},'*')}</script>`

	// Find the end of the first script tag (where reload is defined).
	// Insert right after it so our replacement runs before xXRQBR.
	firstScriptEnd := strings.Index(html, "</script>")
	if firstScriptEnd < 0 {
		return "", fmt.Errorf("could not find first </script> in WAF HTML")
	}
	insertAt := firstScriptEnd + len("</script>")

	modifiedHTML := html[:insertAt] + interceptScript + html[insertAt:]

	wrapper := map[string]interface{}{
		"_waf":   true,
		"html":   modifiedHTML,
		"acwTc":  acwTc,
	}
	wrapperJSON, err := json.Marshal(wrapper)
	if err != nil {
		return "", fmt.Errorf("marshal waf wrapper: %w", err)
	}
	return string(wrapperJSON), nil
}
