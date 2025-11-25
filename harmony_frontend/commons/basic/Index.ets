export { add } from './src/main/ets/utils/Calc';

export * from './src/main/ets/utils/Logger'

export * from './src/main/ets/viewmodels/common'

export { PAGE_PATH } from './src/main/ets/constants/PAGE_PATH'

export { ScreenManager, BreakPointEnum } from './src/main/ets/utils/ScreenManager';

export { AppBreakPoint } from './src/main/ets/viewmodels/AppBreakPoint';

export { AppSafeArea } from './src/main/ets/viewmodels/AppSafeArea';

export { BreakPointType } from './src/main/ets/viewmodels/BreakPointType'

export { AppSelectedSchool,
  SchoolOption,
  SchoolSelectionSnapshot,
  AppEditSelectedSchool,
  AppSchoolPickerContext } from './src/main/ets/viewmodels/School'

export { ProgressLoading } from './src/main/ets/components/ProgressLoading'

export { TabItem } from './src/main/ets/viewmodels/task'

export { TaskDTO, TaskItemBase, TaskItem, TaskMode, TaskStatus } from './src/main/ets/viewmodels/task'

export { TaskBidDTO, TaskBidItem, BaseResponse as TaskBidBaseResponse } from './src/main/ets/viewmodels/taskBid'

export { SquareCommentDTO,
  SquareCommentItem,
  CreateCommentPayload,
  BaseResponse as SquareCommentBaseResponse } from './src/main/ets/viewmodels/squareComment'

export { HDMLoading } from './src/main/ets/components/HDMLoading'

export { AuthHeader, HttpClient } from './src/main/ets/utils/HttpClient'

export { GlobalVariable } from './src/main/ets/components/GlobalVariable'

export { NavBar } from './src/main/ets/components/NavBar'
export { AppImagePreview } from './src/main/ets/viewmodels/ImagePreviewVM'
export { AppAvatarCrop } from './src/main/ets/viewmodels/AvatarCropVM'

export { huaweiAuthManager } from './src/main/ets/utils/HuaweiAuthPlugin'

export { auth } from './src/main/ets/utils/Auth'

export { userPersistence, USER_LOGIN_TIME_KEY } from './src/main/ets/utils/UserPersistenceManager'

export { schoolPersistence, SCHOOL_SELECTION_VERSION_KEY } from './src/main/ets/utils/SchoolPersistenceManager'

export { uploadSingle, uploadBatch, validateImageBytes } from './src/main/ets/utils/UploadManager'

export type { UploadScene,
  UploadExtraFields,
  UploadFileItem,
  UploadResultItem,
  UploadProgressEvent } from './src/main/ets/utils/UploadManager'

export { readFileAsBytes, guessMimeByName } from './src/main/ets/utils/LocalFileReadService'

export { AliPayPayResult, AliPaySDK } from './src/main/ets/utils/AliPaySDK'
