package app

// MarketPlugin describes a plugin available in the marketplace
type MarketPlugin struct {
	ID          string                 `json:"id"`
	Name        string                 `json:"name"`
	Version     string                 `json:"version"`
	Author      string                 `json:"author"`
	Description string                 `json:"description"`
	Icon        string                 `json:"icon"`
	Category    string                 `json:"category"`
	Tags        []string               `json:"tags"`
	Price       string                 `json:"price"`
	Downloads   int                    `json:"downloads"`
	Rating      float64                `json:"rating"`
	DataSchema  map[string]interface{} `json:"dataSchema"`
	SampleData  interface{}            `json:"sampleData"`
	Screenshot  string                 `json:"screenshot"`
}

// FetchMarketPlugins returns the list of plugins available in the marketplace
// TODO: Replace mock data with real API call to market.whales.dev
func (a *App) FetchMarketPlugins() []MarketPlugin {
	return []MarketPlugin{
		{
			ID:          "gantt",
			Name:        "甘特图",
			Version:     "1.0.0",
			Author:      "Whales Team",
			Description:  "项目进度甘特图渲染器，支持任务时间线、进度追踪和依赖关系展示",
			Icon:        "📊",
			Category:    "chart",
			Tags:        []string{"项目管理", "时间线", "进度"},
			Price:       "免费",
			Downloads:   1280,
			Rating:      4.8,
			DataSchema: map[string]interface{}{
				"type": "array",
				"items": map[string]interface{}{
					"type": "object",
					"required": []string{"title", "startDate", "endDate"},
					"properties": map[string]interface{}{
						"title":      map[string]interface{}{"type": "string", "title": "任务名称"},
						"startDate":  map[string]interface{}{"type": "string", "format": "date", "title": "开始日期"},
						"endDate":    map[string]interface{}{"type": "string", "format": "date", "title": "结束日期"},
						"progress":   map[string]interface{}{"type": "number", "title": "进度(%)"},
						"color":      map[string]interface{}{"type": "string", "title": "颜色"},
					},
				},
			},
			SampleData: []interface{}{
				map[string]interface{}{"title": "需求分析", "startDate": "2025-01-01", "endDate": "2025-01-15", "progress": 100, "color": "#6366f1"},
				map[string]interface{}{"title": "技术方案", "startDate": "2025-01-10", "endDate": "2025-01-25", "progress": 60, "color": "#8b5cf6"},
				map[string]interface{}{"title": "开发实现", "startDate": "2025-01-20", "endDate": "2025-02-15", "progress": 30, "color": "#0ea5e9"},
				map[string]interface{}{"title": "测试验收", "startDate": "2025-02-10", "endDate": "2025-02-28", "progress": 0, "color": "#14b8a6"},
			},
			Screenshot: "gantt-preview.png",
		},
		{
			ID:          "calendar",
			Name:        "日历视图",
			Version:     "1.0.0",
			Author:      "Whales Team",
			Description:  "日历视图渲染器，支持日程安排、事件标注和日期区间展示",
			Icon:        "🗓",
			Category:    "chart",
			Tags:        []string{"日历", "日程", "时间管理"},
			Price:       "免费",
			Downloads:   856,
			Rating:      4.5,
			DataSchema: map[string]interface{}{
				"type": "array",
				"items": map[string]interface{}{
					"type": "object",
					"required": []string{"title", "date"},
					"properties": map[string]interface{}{
						"title": map[string]interface{}{"type": "string", "title": "事件标题"},
						"date":  map[string]interface{}{"type": "string", "format": "date", "title": "日期"},
						"color": map[string]interface{}{"type": "string", "title": "标记颜色"},
						"desc":  map[string]interface{}{"type": "string", "title": "事件描述"},
					},
				},
			},
			SampleData: []interface{}{
				map[string]interface{}{"title": "项目评审", "date": "2025-01-20", "color": "#ef4444", "desc": "第一阶段评审会议"},
				map[string]interface{}{"title": "版本发布", "date": "2025-02-01", "color": "#10b981", "desc": "v1.0 正式发布"},
				map[string]interface{}{"title": "团队建设", "date": "2025-02-15", "color": "#f59e0b", "desc": "季度团建活动"},
			},
			Screenshot: "calendar-preview.png",
		},
		{
			ID:          "mindmap",
			Name:        "思维导图",
			Version:     "1.0.0",
			Author:      "Whales Team",
			Description:  "思维导图渲染器，支持层级展开、节点折叠和关联线展示",
			Icon:        "🧠",
			Category:    "chart",
			Tags:        []string{"思维导图", "头脑风暴", "知识梳理"},
			Price:       "¥9.9/月",
			Downloads:   2340,
			Rating:      4.9,
			DataSchema: map[string]interface{}{
				"type": "object",
				"required": []string{"root"},
				"properties": map[string]interface{}{
					"root": map[string]interface{}{"type": "string", "title": "中心主题"},
				},
			},
			SampleData: map[string]interface{}{
				"root": "项目规划",
			},
			Screenshot: "mindmap-preview.png",
		},
		{
			ID:          "kanban",
			Name:        "看板",
			Version:     "1.0.0",
			Author:      "Whales Team",
			Description:  "看板视图渲染器，支持拖拽排序、泳道分组和状态流转",
			Icon:        "📋",
			Category:    "project",
			Tags:        []string{"看板", "任务管理", "敏捷"},
			Price:       "免费",
			Downloads:   3100,
			Rating:      4.7,
			DataSchema: map[string]interface{}{
				"type": "array",
				"items": map[string]interface{}{
					"type": "object",
					"required": []string{"title", "status"},
					"properties": map[string]interface{}{
						"title":  map[string]interface{}{"type": "string", "title": "卡片标题"},
						"status": map[string]interface{}{"type": "string", "title": "状态", "enum": []string{"todo", "doing", "done"}},
						"assignee": map[string]interface{}{"type": "string", "title": "负责人"},
						"priority": map[string]interface{}{"type": "string", "title": "优先级"},
					},
				},
			},
			SampleData: []interface{}{
				map[string]interface{}{"title": "设计原型", "status": "done", "assignee": "Alice", "priority": "high"},
				map[string]interface{}{"title": "开发接口", "status": "doing", "assignee": "Bob", "priority": "high"},
				map[string]interface{}{"title": "编写文档", "status": "todo", "assignee": "Carol", "priority": "medium"},
			},
			Screenshot: "kanban-preview.png",
		},
		{
			ID:          "stat-card",
			Name:        "统计卡片",
			Version:     "1.0.0",
			Author:      "Whales Team",
			Description:  "统计指标卡片渲染器，支持数字动画、趋势箭头和迷你图表",
			Icon:        "📈",
			Category:    "dashboard",
			Tags:        []string{"统计", "指标", "仪表盘"},
			Price:       "免费",
			Downloads:   1890,
			Rating:      4.6,
			DataSchema: map[string]interface{}{
				"type": "array",
				"items": map[string]interface{}{
					"type": "object",
					"required": []string{"label", "value"},
					"properties": map[string]interface{}{
						"label":  map[string]interface{}{"type": "string", "title": "指标名"},
						"value":  map[string]interface{}{"type": "number", "title": "数值"},
						"trend":  map[string]interface{}{"type": "number", "title": "趋势(%)"},
						"icon":   map[string]interface{}{"type": "string", "title": "图标"},
					},
				},
			},
			SampleData: []interface{}{
				map[string]interface{}{"label": "总收入", "value": 48200, "trend": 12.5, "icon": "💰"},
				map[string]interface{}{"label": "活跃用户", "value": 3842, "trend": 8.3, "icon": "👥"},
				map[string]interface{}{"label": "完成率", "value": 96, "trend": -2.1, "icon": "✅"},
			},
			Screenshot: "stat-card-preview.png",
		},
	}
}