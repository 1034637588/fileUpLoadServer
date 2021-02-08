import fs, { WriteStream } from 'fs-extra';
import path from 'path';
const DEF_SIZE = 1024 * 1024 * 10;
export const TEMP_DIR = path.resolve(__dirname,'..','temp');
export const PUB_DIR = path.resolve(__dirname,'..','public');
export const splitChunks = async (fliename: string, size: number = DEF_SIZE) => {
    let filePath = path.resolve(__dirname,'..',fliename); // 需要解析的文件名
    const chunksDir = path.resolve(TEMP_DIR,fliename); //以文件名命名的目录 存放分割后的文件
    await fs.mkdirp(chunksDir); // 创建文件夹
    let content = await fs.readFile(filePath);
    let i = 0,current = 0,length = content.length;
    while(current < length){ // 切片
        await fs.writeFile(
            path.resolve(chunksDir,fliename + '-' + i),
            content.slice(current,current + size)
        );
        i++;
        current += size;
    }
}
console.log(TEMP_DIR)


const pipeStream = (filePath:string,ws:WriteStream)=>{
    return new Promise((resolve:Function,reject:Function)=>{
        let rs = fs.createReadStream(filePath);
        rs.on('end',async ()=>{
            await fs.unlink(filePath);
            resolve();
        })
        rs.pipe(ws);
    })
}

// 合并分割后的文件
export const mergeChunks = async (fliename:string,size:number = DEF_SIZE)=>{
    const filePath = path.resolve(PUB_DIR,fliename);
    const chunksDir = path.resolve(TEMP_DIR,fliename);
    const chunkFiles = await fs.readdir(chunksDir);
    // 文件名进行排序
    chunkFiles.sort((a,b)=>{
        return Number(a.split('-')[1]) - Number(b.split('-')[1]);
    });
    await Promise.all(chunkFiles.map((chunkFile:string,index:number)=>{
        return pipeStream(
            path.resolve(chunksDir,chunkFile),
            fs.createWriteStream(filePath,{
                start:index * size
            })
        );
    }));
    await fs.rmdir(chunksDir);
}
// mergeChunks('vue3.png');


