package main

import (
	"context"
	"fmt"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// App struct
type App struct {
	ctx       context.Context
	starCount int
}

// NewApp creates a new App application struct
// NewApp 创建一个新的 App 应用程序
func NewApp() *App {
	return &App{}
}

// startup is called at application startup
// startup 在应用程序启动时调用
func (a *App) startup(ctx context.Context) {
	// Perform your setup here
	// 在这里执行初始化设置
	a.ctx = ctx
}

// domReady is called after the front-end dom has been loaded
// domReady 在前端Dom加载完毕后调用
func (a *App) domReady(ctx context.Context) {
	// Add your action here
	// 在这里添加你的操作
}

// beforeClose is called when the application is about to quit,
// either by clicking the window close button or calling runtime.Quit.
// Returning true will cause the application to continue,
// false will continue shutdown as normal.
// beforeClose在单击窗口关闭按钮或调用runtime.Quit即将退出应用程序时被调用.
// 返回 true 将导致应用程序继续，false 将继续正常关闭。
func (a *App) beforeClose(ctx context.Context) (prevent bool) {
	return false
}

// shutdown is called at application termination
// 在应用程序终止时被调用
func (a *App) shutdown(ctx context.Context) {
	// Perform your teardown here
	// 在此处做一些资源释放的操作
}

type StarResult struct {
	Message string `json:"message"`
	Count   int    `json:"count"`
}

func (a *App) StarMe() StarResult {
	a.starCount++
	fmt.Printf("hello %d\n", a.starCount)
	return StarResult{
		Message: fmt.Sprintf("hello %d", a.starCount),
		Count:   a.starCount,
	}
}

// SelectDirectory opens a native directory picker dialog and returns the selected path.
// SelectDirectory 打开原生文件夹选择对话框并返回选中的路径。
func (a *App) SelectDirectory() (string, error) {
	path, err := runtime.OpenDirectoryDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "选择项目文件夹",
	})
	if err != nil {
		return "", err
	}
	return path, nil
}
