import express, { Request, Response, NextFunction } from 'express';
import logger from 'morgan';
import createError from 'http-errors';
import { INTERNAL_SERVER_ERROR } from 'http-status-codes';
import cors from 'cors';
import path from 'path';
import fs from 'fs-extra';
import { TEMP_DIR, mergeChunks, PUB_DIR } from './utils/utils';
let app = express();
app.use(logger('dev'));
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(express.static(path.resolve(__dirname, 'public')));

// 上传
app.post('/upload/:filename/:chunkname/:start', async (req: Request, res: Response, next: NextFunction) => {
    let { filename, chunkname } = req.params;
    let start = Number(req.params.start)
    let chunk_dir = path.resolve(TEMP_DIR, filename);
    let exist = await fs.pathExists(chunk_dir);
    if (!exist) {
        await fs.mkdirs(chunk_dir);
    }
    let chunkFilePath = path.resolve(chunk_dir, chunkname); // 分块的文件存储路径
    let ws = fs.createWriteStream(chunkFilePath, { flags: 'a', start });
    req.on('end', () => {
        ws.close();
        res.json({ success: true });
    });
    req.on('error', () => {
        ws.close();
    });
    req.on('close', () => {
        ws.close();
    });
    req.pipe(ws);
});

// 合并
app.get('/merge/:filename', async (req: Request, res: Response) => {
    let { filename } = req.params;
    await mergeChunks(filename);
    res.json({ success: true })
});

// 查看当前上传状态
app.get('/verify/:filename', async (req: Request, res: Response) => {
    let { filename } = req.params;
    let isDone = await fs.pathExists(path.resolve(PUB_DIR, filename));
    // 如果合并后的文件存在 那么说名不需要上传了
    if (isDone) {
        res.json({ success: true, needUpLoad: false })
    }
    let tempDir = path.resolve(TEMP_DIR, filename);
    let uploadList: any[] = [];
    let tempExist = await fs.pathExists(tempDir);
    // 如果存在说明之前上传过
    if (tempExist) {
        uploadList = await fs.readdir(tempDir);
        uploadList = await Promise.all(uploadList.map(async (filename: string) => {
            // 读取每一个已经上传过的分块的文件大小
            let stat = await fs.stat(path.resolve(tempDir, filename));
            return {
                filename,
                size: stat.size // 目前上传的大小
            }
        }));
    }
    res.json({ success: true, needUpLoad: true, uploadList });
});

app.listen(process.env.PORT, function () {
    console.log(`server started at ${process.env.PORT}`);
});