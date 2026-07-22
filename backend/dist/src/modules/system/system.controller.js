"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SystemController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const system_service_1 = require("./system.service");
let SystemController = class SystemController {
    systemService;
    constructor(systemService) {
        this.systemService = systemService;
    }
    getSystemStatus() {
        return this.systemService.getSystemMetrics();
    }
    getDashboardUi() {
        return this.readFile('dashboard.html');
    }
    getDashboardCss() {
        return this.readFile('dashboard.css');
    }
    getDashboardJs() {
        return this.readFile('dashboard.js');
    }
    readFile(fileName) {
        const distPath = path.join(__dirname, 'dashborad_ui', fileName);
        const srcPath = path.join(process.cwd(), 'src', 'modules', 'system', 'dashborad_ui', fileName);
        const filePath = fs.existsSync(distPath) ? distPath : srcPath;
        return fs.readFileSync(filePath, 'utf8');
    }
};
exports.SystemController = SystemController;
__decorate([
    (0, common_1.Get)('status'),
    (0, swagger_1.ApiOperation)({ summary: 'Get live system memory, CPU, uptime, and DB metrics' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Live system status metrics returned successfully' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], SystemController.prototype, "getSystemStatus", null);
__decorate([
    (0, common_1.Get)('dashboard'),
    (0, common_1.Header)('Content-Type', 'text/html'),
    (0, swagger_1.ApiOperation)({ summary: 'View Live System Status & API Performance Dashboard UI' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", String)
], SystemController.prototype, "getDashboardUi", null);
__decorate([
    (0, common_1.Get)('dashboard.css'),
    (0, common_1.Header)('Content-Type', 'text/css'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", String)
], SystemController.prototype, "getDashboardCss", null);
__decorate([
    (0, common_1.Get)('dashboard.js'),
    (0, common_1.Header)('Content-Type', 'application/javascript'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", String)
], SystemController.prototype, "getDashboardJs", null);
exports.SystemController = SystemController = __decorate([
    (0, swagger_1.ApiTags)('System & Health Status'),
    (0, common_1.Controller)('system'),
    __metadata("design:paramtypes", [system_service_1.SystemService])
], SystemController);
//# sourceMappingURL=system.controller.js.map