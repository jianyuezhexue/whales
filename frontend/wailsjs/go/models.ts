export namespace app {
	
	export class AuiOutputFileInfo {
	    name: string;
	    path: string;
	    size: number;
	
	    static createFrom(source: any = {}) {
	        return new AuiOutputFileInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.path = source["path"];
	        this.size = source["size"];
	    }
	}
	export class AuiOutputFileResult {
	    content: string;
	    mimeType: string;
	
	    static createFrom(source: any = {}) {
	        return new AuiOutputFileResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.content = source["content"];
	        this.mimeType = source["mimeType"];
	    }
	}
	export class AuiPluginAssets {
	    js: string;
	    css: string;
	
	    static createFrom(source: any = {}) {
	        return new AuiPluginAssets(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.js = source["js"];
	        this.css = source["css"];
	    }
	}
	export class AuiPluginMeta {
	    id: string;
	    name: string;
	    version: string;
	    author: string;
	    description: string;
	    icon: string;
	    category: string;
	    tags: string[];
	    dataSchema: Record<string, any>;
	    sampleData: any;
	    entry: string;
	    style: string;
	
	    static createFrom(source: any = {}) {
	        return new AuiPluginMeta(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.version = source["version"];
	        this.author = source["author"];
	        this.description = source["description"];
	        this.icon = source["icon"];
	        this.category = source["category"];
	        this.tags = source["tags"];
	        this.dataSchema = source["dataSchema"];
	        this.sampleData = source["sampleData"];
	        this.entry = source["entry"];
	        this.style = source["style"];
	    }
	}
	export class FileInfo {
	    name: string;
	    path: string;
	    isDir: boolean;
	    size: number;
	    modTime: string;
	
	    static createFrom(source: any = {}) {
	        return new FileInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.path = source["path"];
	        this.isDir = source["isDir"];
	        this.size = source["size"];
	        this.modTime = source["modTime"];
	    }
	}
	export class LocalSkillInfo {
	    id: string;
	    name: string;
	    description: string;
	    path: string;
	
	    static createFrom(source: any = {}) {
	        return new LocalSkillInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.description = source["description"];
	        this.path = source["path"];
	    }
	}
	export class MarketPlugin {
	    id: string;
	    name: string;
	    version: string;
	    author: string;
	    description: string;
	    icon: string;
	    category: string;
	    tags: string[];
	    price: string;
	    downloads: number;
	    rating: number;
	    dataSchema: Record<string, any>;
	    sampleData: any;
	    screenshot: string;
	
	    static createFrom(source: any = {}) {
	        return new MarketPlugin(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.version = source["version"];
	        this.author = source["author"];
	        this.description = source["description"];
	        this.icon = source["icon"];
	        this.category = source["category"];
	        this.tags = source["tags"];
	        this.price = source["price"];
	        this.downloads = source["downloads"];
	        this.rating = source["rating"];
	        this.dataSchema = source["dataSchema"];
	        this.sampleData = source["sampleData"];
	        this.screenshot = source["screenshot"];
	    }
	}
	export class StarResult {
	    message: string;
	    count: number;
	
	    static createFrom(source: any = {}) {
	        return new StarResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.message = source["message"];
	        this.count = source["count"];
	    }
	}

}

