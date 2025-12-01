/*
 * Copyright (c) 2024 Huawei Device Co., Ltd.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// instrument ignore file
// auto-generated TaskDetailViewBuilder.ets by HMRouter
import  { TaskDetailView }  from '../views/TaskDetailView'
import { NavDestinationHelper } from '@hadss/hmrouter';

@Builder
export function TaskDetailViewBuilder(name: string, param: Object) {
  TaskDetailViewGenerated()
}

export const TaskDetailViewBuilderWrapBuilder = wrapBuilder(TaskDetailViewBuilder)

@Component
export struct TaskDetailViewGenerated {
  private helper: NavDestinationHelper = new NavDestinationHelper(this);

  build() {
    if(this.helper.sdkApiVersion>=19){
      NavDestination() {
        TaskDetailView()
      }
      
      .hideTitleBar(true)
      .attributeModifier(this.helper.modifier)
      .gestureModifier(this.helper.gestureModifier)
      .onWillAppear(()=>{this.helper.onWillAppear()})
      .onAppear(() => {this.helper.onAppear()})
      .onWillShow(()=>{this.helper.onWillShow()})
      .onShown(()=>{this.helper.onShown()})
      .onWillHide(()=>{this.helper.onWillHide()})
      .onHidden(()=>{this.helper.onHidden()})
      .onWillDisappear(()=>{this.helper.onWillDisappear()})
      .onDisAppear(()=>{this.helper.onDisAppear()})
      .onReady((ctx)=>{this.helper.onReady(ctx)})
      .onBackPressed(()=> this.helper.onBackPressed())
      .onResult((result:ESObject)=>{this.helper.onResult(result)})
      .onActive((activeReason:NavDestinationActiveReason)=>{this.helper.onActive(activeReason)})
      .onInactive((inactiveReason:NavDestinationActiveReason)=>{this.helper.onInactive(inactiveReason)})
      .onNewParam((newParam:ESObject)=>{this.helper.onNewParam(newParam)})
    }else if(this.helper.sdkApiVersion>=17){
      NavDestination() {
        TaskDetailView()
      }
      
      .hideTitleBar(true)
      .attributeModifier(this.helper.modifier)
      .gestureModifier(this.helper.gestureModifier)
      .onWillAppear(()=>{this.helper.onWillAppear()})
      .onAppear(() => {this.helper.onAppear()})
      .onWillShow(()=>{this.helper.onWillShow()})
      .onShown(()=>{this.helper.onShown()})
      .onWillHide(()=>{this.helper.onWillHide()})
      .onHidden(()=>{this.helper.onHidden()})
      .onWillDisappear(()=>{this.helper.onWillDisappear()})
      .onDisAppear(()=>{this.helper.onDisAppear()})
      .onReady((ctx)=>{this.helper.onReady(ctx)})
      .onBackPressed(()=> this.helper.onBackPressed())
      .onResult((result:ESObject)=>{this.helper.onResult(result)})
      .onActive((activeReason:NavDestinationActiveReason)=>{this.helper.onActive(activeReason)})
      .onInactive((inactiveReason:NavDestinationActiveReason)=>{this.helper.onInactive(inactiveReason)})
    }else if(this.helper.sdkApiVersion>=15){
      NavDestination() {
        TaskDetailView()
      }
      
      .hideTitleBar(true)
      .attributeModifier(this.helper.modifier)
      .gestureModifier(this.helper.gestureModifier)
      .onWillAppear(()=>{this.helper.onWillAppear()})
      .onAppear(() => {this.helper.onAppear()})
      .onWillShow(()=>{this.helper.onWillShow()})
      .onShown(()=>{this.helper.onShown()})
      .onWillHide(()=>{this.helper.onWillHide()})
      .onHidden(()=>{this.helper.onHidden()})
      .onWillDisappear(()=>{this.helper.onWillDisappear()})
      .onDisAppear(()=>{this.helper.onDisAppear()})
      .onReady((ctx)=>{this.helper.onReady(ctx)})
      .onBackPressed(()=> this.helper.onBackPressed())
      .onResult((result:ESObject)=>{this.helper.onResult(result)})
    }else{
      NavDestination() {
        TaskDetailView()
      }
      
      .hideTitleBar(true)
      .attributeModifier(this.helper.modifier)
      .gestureModifier(this.helper.gestureModifier)
      .onWillAppear(()=>{this.helper.onWillAppear()})
      .onAppear(() => {this.helper.onAppear()})
      .onWillShow(()=>{this.helper.onWillShow()})
      .onShown(()=>{this.helper.onShown()})
      .onWillHide(()=>{this.helper.onWillHide()})
      .onHidden(()=>{this.helper.onHidden()})
      .onWillDisappear(()=>{this.helper.onWillDisappear()})
      .onDisAppear(()=>{this.helper.onDisAppear()})
      .onReady((ctx)=>{this.helper.onReady(ctx)})
      .onBackPressed(()=> this.helper.onBackPressed())
    }
    
  }
}