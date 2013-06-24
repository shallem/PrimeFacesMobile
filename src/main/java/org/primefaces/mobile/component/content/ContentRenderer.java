/*
 * Copyright 2009-2011 Prime Technology.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
package org.primefaces.mobile.component.content;

import java.io.IOException;
import javax.faces.component.UIComponent;
import javax.faces.context.FacesContext;
import javax.faces.context.ResponseWriter;
import org.primefaces.renderkit.CoreRenderer;

public class ContentRenderer extends CoreRenderer {

    @Override
    public void encodeBegin(FacesContext context, UIComponent component) throws IOException {
        ResponseWriter writer = context.getResponseWriter();
        Content content = (Content) component;

        writer.startElement("div", content);
        writer.writeAttribute("id", content.getClientId(context), "id");
        writer.writeAttribute("data-role", "content", null);
        
        String contentStyle = "position:fixed;";
        if (content.isFullScreen()) {
            //contentStyle = contentStyle + " overflow: hidden;";
        }
        writer.writeAttribute("style", contentStyle, null);
        
        if(content.getStyle() != null) writer.writeAttribute("style", content.getStyle(), null);
        if(content.getStyleClass() != null) {
            writer.writeAttribute("class", "hx-main-content " + content.getStyleClass(), null);
        } else {
            writer.writeAttribute("class", "hx-main-content", null);
        }
    }

    @Override
    public void encodeEnd(FacesContext context, UIComponent component) throws IOException {
        ResponseWriter writer = context.getResponseWriter();

        writer.endElement("div");
    }
}