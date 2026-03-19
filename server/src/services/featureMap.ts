import fs from 'fs';
import path from 'path';

export interface FeatureItem {
  feature: string;
  description: string;
  module: string;
  files: string[];
}

export interface FeatureMap {
  projectId: string;
  projectName: string;
  generatedAt: string;
  totalFeatures: number;
  features: FeatureItem[];
}

/**
 * Analyze project structure and generate a feature map
 * Step 7 of 11-step import: 生成功能定位文件
 */
export async function generateFeatureMap(
  projectPath: string,
  projectId: string,
  projectName: string
): Promise<FeatureMap> {
  const features: FeatureItem[] = [];
  
  // Scan for pages/routes (Next.js, React)
  const pagesDir = path.join(projectPath, 'app');
  if (fs.existsSync(pagesDir)) {
    const pageFiles = findFiles(pagesDir, ['page.tsx', 'page.ts', 'layout.tsx'], 3);
    for (const file of pageFiles) {
      const relPath = path.relative(projectPath, file);
      const featureName = extractFeatureName(file, pagesDir);
      features.push({
        feature: featureName,
        description: `页面模块: ${relPath}`,
        module: 'ui',
        files: [relPath],
      });
    }
  }

  // Scan for API routes
  const apiDir = path.join(projectPath, 'app', 'api');
  if (fs.existsSync(apiDir)) {
    const apiFiles = findFiles(apiDir, ['route.ts', 'route.js'], 5);
    for (const file of apiFiles) {
      const relPath = path.relative(projectPath, file);
      const featureName = `API: ${relPath.replace(/\\/g, '/').replace('/route', '')}`;
      features.push({
        feature: featureName,
        description: `后端接口: /api/${relPath.replace(/\\/g, '/').replace('app/api/', '').replace('/route', '')}`,
        module: 'api',
        files: [relPath],
      });
    }
  }

  // Scan for server services
  const serverServicesDir = path.join(projectPath, 'server', 'src', 'services');
  if (fs.existsSync(serverServicesDir)) {
    const serviceFiles = fs.readdirSync(serverServicesDir).filter(f => f.endsWith('.ts') || f.endsWith('.js'));
    for (const file of serviceFiles) {
      const serviceName = file.replace(/\.(ts|js)$/, '');
      features.push({
        feature: `服务: ${serviceName}`,
        description: `后端业务服务: ${file}`,
        module: 'service',
        files: [`server/src/services/${file}`],
      });
    }
  }

  // Scan for components
  const componentsDir = path.join(projectPath, 'components');
  if (fs.existsSync(componentsDir)) {
    const compDirs = fs.readdirSync(componentsDir).filter(f => {
      const p = path.join(componentsDir, f);
      return fs.statSync(p).isDirectory();
    });
    for (const compDir of compDirs) {
      const compFiles = fs.readdirSync(path.join(componentsDir, compDir)).filter(f => f.endsWith('.tsx'));
      if (compFiles.length > 0) {
        features.push({
          feature: `组件: ${compDir}`,
          description: `React 组件库: ${compFiles.join(', ')}`,
          module: 'ui',
          files: [`components/${compDir}/`],
        });
      }
    }
  }

  const featureMap: FeatureMap = {
    projectId,
    projectName,
    generatedAt: new Date().toISOString(),
    totalFeatures: features.length,
    features,
  };

  // Save to file
  const outputPath = path.join(process.env.PROJECT_DATA_DIR || '/tmp/teamclaw/projects', projectId, 'feature-map.json');
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(featureMap, null, 2));

  return featureMap;
}

function findFiles(dir: string, patterns: string[], maxDepth: number, currentDepth = 0, results: string[] = []): string[] {
  if (currentDepth > maxDepth) return results;
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
        findFiles(fullPath, patterns, maxDepth, currentDepth + 1, results);
      } else if (entry.isFile()) {
        for (const pattern of patterns) {
          if (entry.name === pattern || entry.name.endsWith(pattern.replace('.tsx', '.tsx').replace('.ts', '.ts'))) {
            results.push(fullPath);
          }
        }
      }
    }
  } catch {
    // ignore permission errors
  }
  return results;
}

function extractFeatureName(filePath: string, baseDir: string): string {
  const rel = path.relative(baseDir, filePath);
  const parts = rel.split(path.sep);
  // e.g. app/projects/page.tsx -> projects
  // e.g. app/projects/[id]/page.tsx -> projects/:id
  if (parts[parts.length - 1] === 'layout.tsx' || parts[parts.length - 1] === 'layout.ts') {
    return parts.slice(0, -1).join('/') || 'root';
  }
  return parts.slice(0, -1).join('/') || 'root';
}

export async function getFeatureMap(projectId: string): Promise<FeatureMap | null> {
  const outputPath = path.join(process.env.PROJECT_DATA_DIR || '/tmp/teamclaw/projects', projectId, 'feature-map.json');
  if (!fs.existsSync(outputPath)) return null;
  return JSON.parse(fs.readFileSync(outputPath, 'utf-8')) as FeatureMap;
}
