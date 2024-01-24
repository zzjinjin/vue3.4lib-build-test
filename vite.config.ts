import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';

const useDevMode = true;

// https://vitejs.dev/config/
export default defineConfig({
	resolve: {
		alias: {
			'@': path.resolve(__dirname, 'src')
		},
	},
	plugins: [vue({
		reactivityTransform: true,
		template: {
			compilerOptions: {
				isCustomElement: tag =>{
					return tag === 'rgba-color-picker' || tag === 'rgb-color-picker';
				}
			}
		}
	})],
	build: {
		lib: {
			entry: path.resolve(__dirname, 'src/index.ts'),
			formats: ['es'],
			fileName: 'index'
		},
		rollupOptions: {
			external: [
				'vue', 
			]
		}
	},
	server: {
		port: 16385,
		cors: true,
	},
});
