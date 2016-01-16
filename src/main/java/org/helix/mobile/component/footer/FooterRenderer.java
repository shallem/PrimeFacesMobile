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
package org.helix.mobile.component.footer;

import java.io.IOException;
import javax.faces.component.UIComponent;
import javax.faces.context.FacesContext;
import javax.faces.context.ResponseWriter;
import org.primefaces.renderkit.CoreRenderer;

public class FooterRenderer extends CoreRenderer {

    @Override
    public void encodeBegin(FacesContext context, UIComponent component) throws IOException {
        ResponseWriter writer = context.getResponseWriter();
        Footer footer = (Footer) component;
        String swatch = footer.getSwatch();

        writer.startElement("div", footer);
        writer.writeAttribute("id", footer.getClientId(context), "id");
        writer.writeAttribute("data-role", "footer", null);
        
        if(footer.getStyle() != null) writer.writeAttribute("style", footer.getStyle(), null);
        if(footer.getStyleClass() != null) writer.writeAttribute("class", footer.getStyleClass(), null);
        if(swatch != null) writer.writeAttribute("data-theme", swatch, null);        
        if(footer.isFixed())  writer.writeAttribute("data-position", "fixed", null);
        
        UIComponent left = footer.getFacet("left");
        UIComponent right = footer.getFacet("right");
        if(left != null) {
            left.encodeAll(context);
        }
        if(right != null) {
            right.encodeAll(context);
        }
    }

    @Override
    public void encodeEnd(FacesContext context, UIComponent component) throws IOException {
        ResponseWriter writer = context.getResponseWriter();

        writer.endElement("div");
    }
}