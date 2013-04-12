/*
THIS SOFTWARE IS PROVIDED BY ANDREW TRICE "AS IS" AND ANY EXPRESS OR
IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO
EVENT SHALL ANDREW TRICE OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT,
INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING,
BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE
OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF
ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/
(function() {
 window.ExternalFileUtil = {
        openWith: function ( name, editURL, component, success, fail) {
            if (component === undefined) {
                return cordova.exec(success, fail, "ExternalFileUtil", "openWith", [name, editURL, 0, 0]);
            }
            var position = PrimeFaces.Utils.getPosition(component);
            return cordova.exec(success, fail, "ExternalFileUtil", "openWith", [name, editURL, position.x, position.y ]);
        }
    };
})();

(function() {
 window.OfflineSave = {
        openWith: function ( name, thumbURL, viewURL, editURL, success, fail) {
            return cordova.exec(success, fail, "OfflineSave", "openWith", [name, thumbURL, viewURL, editURL]);
        }
    };
})();