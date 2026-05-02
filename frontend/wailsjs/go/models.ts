export namespace main {
	
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

