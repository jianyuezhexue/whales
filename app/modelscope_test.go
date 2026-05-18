package app

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

// buildSkillsBody mirrors FetchSkillsMarket request body construction for test verification.
func buildSkillsBody(pageSize int, pageNumber int, query string) map[string]interface{} {
	return map[string]interface{}{
		"PageSize":         pageSize,
		"PageNumber":       pageNumber,
		"Query":            query,
		"Sort":             "Default",
		"Criterion":        []string{},
		"WithTopCollection": query == "",
	}
}

func TestBuildSkillsBody_SearchQuery(t *testing.T) {
	body := buildSkillsBody(24, 1, "find")

	if body["Query"] != "find" {
		t.Errorf("expected Query='find', got %v", body["Query"])
	}
	if body["WithTopCollection"] != false {
		t.Errorf("expected WithTopCollection=false for search query, got %v", body["WithTopCollection"])
	}
	if body["PageSize"] != 24 {
		t.Errorf("expected PageSize=24, got %v", body["PageSize"])
	}
	if body["PageNumber"] != 1 {
		t.Errorf("expected PageNumber=1, got %v", body["PageNumber"])
	}
}

func TestBuildSkillsBody_EmptyQuery(t *testing.T) {
	body := buildSkillsBody(24, 1, "")

	if body["Query"] != "" {
		t.Errorf("expected Query='', got %v", body["Query"])
	}
	if body["WithTopCollection"] != true {
		t.Errorf("expected WithTopCollection=true for empty query, got %v", body["WithTopCollection"])
	}
}

func TestDoModelscopeRequest_SearchResponse_SkillList(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPut {
			t.Errorf("expected PUT, got %s", r.Method)
		}

		var receivedBody map[string]interface{}
		if err := json.NewDecoder(r.Body).Decode(&receivedBody); err != nil {
			t.Fatalf("failed to decode request body: %v", err)
		}

		if receivedBody["Query"] != "find" {
			t.Errorf("expected Query='find', got %v", receivedBody["Query"])
		}
		if receivedBody["WithTopCollection"] != false {
			t.Errorf("expected WithTopCollection=false, got %v", receivedBody["WithTopCollection"])
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"Code": 200,
			"Data": map[string]interface{}{
				"SkillList": []interface{}{
					map[string]interface{}{
						"Name":        "find-skills",
						"DisplayName": "Find Skills",
						"Description": "Helps users discover skills",
						"Path":        "anthropics",
						"Owner":       "anthropics",
					},
				},
				"TotalCount": 277,
			},
		})
	}))
	defer server.Close()

	body := buildSkillsBody(24, 1, "find")
	result, err := doModelscopeRequest(server.Client(), http.MethodPut, server.URL, body)
	if err != nil {
		t.Fatalf("doModelscopeRequest returned error: %v", err)
	}

	var parsed struct {
		Code int `json:"Code"`
		Data struct {
			SkillList  []map[string]interface{} `json:"SkillList"`
			TotalCount int                      `json:"TotalCount"`
		} `json:"Data"`
	}
	if err := json.Unmarshal([]byte(result), &parsed); err != nil {
		t.Fatalf("failed to parse result JSON: %v", err)
	}

	if parsed.Code != 200 {
		t.Errorf("expected Code=200, got %d", parsed.Code)
	}
	if len(parsed.Data.SkillList) != 1 {
		t.Fatalf("expected 1 skill in SkillList, got %d", len(parsed.Data.SkillList))
	}
	if parsed.Data.SkillList[0]["Name"] != "find-skills" {
		t.Errorf("expected Name='find-skills', got %v", parsed.Data.SkillList[0]["Name"])
	}
	if parsed.Data.TotalCount != 277 {
		t.Errorf("expected TotalCount=277, got %d", parsed.Data.TotalCount)
	}
}

func TestDoModelscopeRequest_TopCollectionResponse(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var receivedBody map[string]interface{}
		json.NewDecoder(r.Body).Decode(&receivedBody)

		if receivedBody["WithTopCollection"] != true {
			t.Errorf("expected WithTopCollection=true for empty query, got %v", receivedBody["WithTopCollection"])
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"Code": 200,
			"Data": map[string]interface{}{
				"SkillCollection": []interface{}{
					map[string]interface{}{
						"IsTop": true,
						"Type":  "skill",
						"Skill": map[string]interface{}{
							"Name":        "example-skill",
							"DisplayName": "Example Skill",
							"Description": "An example skill",
							"Path":        "owner",
						},
					},
				},
				"TotalCount": 75284,
			},
		})
	}))
	defer server.Close()

	body := buildSkillsBody(24, 1, "")
	result, err := doModelscopeRequest(server.Client(), http.MethodPut, server.URL, body)
	if err != nil {
		t.Fatalf("doModelscopeRequest returned error: %v", err)
	}

	var parsed struct {
		Code int `json:"Code"`
		Data struct {
			SkillCollection []map[string]interface{} `json:"SkillCollection"`
			TotalCount      int                     `json:"TotalCount"`
		} `json:"Data"`
	}
	if err := json.Unmarshal([]byte(result), &parsed); err != nil {
		t.Fatalf("failed to parse result JSON: %v", err)
	}

	if len(parsed.Data.SkillCollection) != 1 {
		t.Fatalf("expected 1 item in SkillCollection, got %d", len(parsed.Data.SkillCollection))
	}
	item := parsed.Data.SkillCollection[0]
	skill, ok := item["Skill"].(map[string]interface{})
	if !ok {
		t.Fatal("expected Skill to be a map")
	}
	if skill["Name"] != "example-skill" {
		t.Errorf("expected Name='example-skill', got %v", skill["Name"])
	}
	if parsed.Data.TotalCount != 75284 {
		t.Errorf("expected TotalCount=75284, got %d", parsed.Data.TotalCount)
	}
}

func TestDoModelscopeRequest_HTTPError(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte("internal server error"))
	}))
	defer server.Close()

	body := buildSkillsBody(24, 1, "test")
	_, err := doModelscopeRequest(server.Client(), http.MethodPut, server.URL, body)
	if err == nil {
		t.Fatal("expected error for HTTP 500, got nil")
	}
}