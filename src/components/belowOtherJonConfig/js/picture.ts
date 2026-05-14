/*
 * @Author: Strayer
 * @Date: 2022-12-13
 * @LastEditors: Strayer
 * @LastEditTime: 2023-02-02
 * @Description: 图片上传部分
 * @FilePath: \heat-web\src\components\belowOtherJonConfig\js\picture.ts
 */
import { UploadProps } from 'element-plus';
import { ref, Ref } from 'vue';

interface ImgCoord {
  xmin: number;
  xmax: number;
  ymin: number;
  ymax: number;
}

interface OtherJsonObjType {
  isCustomImage: boolean;
  imgUrl: string;
  imgCoord: ImgCoord;
  hideMap: boolean;
  isCustomMapInit: boolean;
  defaultMapGrade: number;
  defaultMapCenter: [number, number];
  opacity: number;
}

export function usePicture(configData: Ref<OtherJsonObjType>) {
  const fileList = ref<any[]>([])

  // 大图预览
  const dialogImageUrl = ref('')
  const dialogVisible = ref(false)

  const handlePictureCardPreview: UploadProps['onPreview'] = (uploadFile) => {
    dialogImageUrl.value = uploadFile.url ?? '';
    dialogVisible.value = true
  }

  function handleRemove() {
    configData.value.imgUrl = '';
  }

  /**
   * @description: 覆盖默认的文件上传
   * 实际项目中替换为你的上传接口
   */
  function httpRequest(file: any) {
    // 示例：使用 FileReader 转换为 base64
    const reader = new FileReader();
    reader.onload = (e) => {
      const url = e.target?.result as string;
      fileList.value = [{ url }];
      configData.value.imgUrl = url;
    };
    reader.readAsDataURL(file.file);

    // 实际项目中应该调用后端接口：
    // const param = new FormData();
    // param.append('file', file.file);
    // return YourUploadApi.post('/upload', param).then(res => {
    //   fileList.value = [{ url: res.data.url }];
    //   configData.value.imgUrl = res.data.url;
    // });
  }

  return {
    fileList,
    handleRemove,
    dialogImageUrl,
    dialogVisible,
    handlePictureCardPreview,
    httpRequest
  }
}
